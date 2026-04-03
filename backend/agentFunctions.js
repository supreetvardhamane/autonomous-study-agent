// agentFunctions.js — Core modular AI functions for the study agent
// Each function implements one capability in the perceive→reason→plan→act→observe loop

const { callWithTool } = require('./aiClient');

// ─── 1. Extract Topics ────────────────────────────────────────────────────────
/**
 * Perceive: reads PDF text → Act: calls AI to extract structured topics
 */
async function extractTopics(pdfText) {
  const systemPrompt = `You are an expert educational content analyst. 
Extract the main topics from study material in a structured way. 
Identify topics that are distinct, learnable units. Aim for 4-8 topics.`;

  const userPrompt = `Extract key topics from the following study material. 
For each topic, assess: how frequently it appears (1-10), 
how important it is for understanding (1-10), and how difficult it is (1-10).

Study Material:
"""
${pdfText.slice(0, 4000)}
"""`;

  const result = await callWithTool(systemPrompt, userPrompt, 'extractTopics');
  return result.topics || [];
}

// ─── 2. Rank Topics ──────────────────────────────────────────────────────────
/**
 * Reason: analyze topic scores → Plan: assign priority labels
 */
function rankTopics(topics) {
  return topics
    .map((topic) => {
      // Weighted priority score: importance counts most, then difficulty, then frequency
      const score = topic.importance * 0.5 + topic.difficulty * 0.3 + topic.frequency * 0.2;

      let priority;
      if (score >= 7.5) priority = 'High';
      else if (score >= 5.5) priority = 'Medium';
      else priority = 'Low';

      return { ...topic, priorityScore: Math.round(score * 10) / 10, priority };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore); // Sort highest priority first
}

// ─── 3. Generate Flashcards ──────────────────────────────────────────────────
/**
 * Act: generate active recall Q&A pairs for a topic
 */
async function generateFlashcards(topicName, topicSummary, pdfContext = '') {
  const systemPrompt = `You are an expert tutor creating flashcards for active recall learning.
Create challenging but fair questions that test deep understanding, not just memorization.
Each card should test a specific, important concept.`;

  const userPrompt = `Generate 5 flashcards for the topic: "${topicName}"
Topic summary: ${topicSummary}

Context from study material:
"""
${pdfContext.slice(0, 2000)}
"""

Create questions that test understanding, application, and analysis — not just definitions.`;

  const result = await callWithTool(systemPrompt, userPrompt, 'generateFlashcards');
  return result.flashcards || [];
}

// ─── 4. Generate Test ────────────────────────────────────────────────────────
/**
 * Act: generate MCQ test with mixed difficulty levels
 */
async function generateTest(topicName, topicSummary, weakAreas = [], pdfContext = '') {
  const systemPrompt = `You are an expert exam writer creating multiple-choice questions.
Create questions across easy, medium, and hard difficulty levels.
Each question must have exactly 4 options with one clearly correct answer.
Focus on conceptual understanding and application.`;

  const weakAreaContext = weakAreas.length
    ? `\nFocus extra attention on these weak areas: ${weakAreas.join(', ')}`
    : '';

  const userPrompt = `Generate 5 multiple-choice test questions for topic: "${topicName}"
Topic summary: ${topicSummary}${weakAreaContext}

Include a mix: 2 easy, 2 medium, 1 hard questions.
Each question ID should be unique (q1, q2, q3...).

Context:
"""
${pdfContext.slice(0, 2000)}
"""`;

  const result = await callWithTool(systemPrompt, userPrompt, 'generateTest');
  return result.questions || [];
}

// ─── 5. Evaluate Answers ─────────────────────────────────────────────────────
/**
 * Observe: assess user's answers → Reason: determine mastery level
 */
async function evaluateAnswers(questions, userAnswers) {
  const systemPrompt = `You are an expert evaluator assessing student performance.
Analyze answers carefully, identify weak areas, and provide constructive feedback.
Be encouraging but honest about gaps in understanding.`;

  // Build a structured comparison
  const answerData = questions.map((q) => ({
    questionId: q.id,
    question: q.question,
    correctAnswer: q.correctAnswer,
    userAnswer: userAnswers[q.id] || 'No answer',
    difficulty: q.difficulty,
  }));

  const userPrompt = `Evaluate the following student answers:

${JSON.stringify(answerData, null, 2)}

Calculate the score percentage, determine the mastery level (weak <50%, medium 50-79%, strong 80%+),
identify specific weak areas, and provide per-question feedback.`;

  const result = await callWithTool(systemPrompt, userPrompt, 'evaluateAnswers');
  return result;
}

// ─── 6. Agent Loop ───────────────────────────────────────────────────────────
/**
 * The core agentic loop: perceive → reason → plan → act → observe
 * 
 * Decides the next action based on performance level:
 * - weak   → regenerate focused flashcards, then retest
 * - medium → generate a new test on the same topic
 * - strong → advance to next topic
 */
async function agentLoop(session, topicName, performanceLevel) {
  const topic = session.topics.find((t) => t.name === topicName);
  if (!topic) return { action: 'error', message: 'Topic not found' };

  // ── Perceive ─────────────────────────────────────────────────────────────
  const currentPerf = session.performance[topicName] || {};
  const currentProgress = session.progress[topicName] || 'pending';

  console.log(`[Agent] Perceive: topic="${topicName}", level="${performanceLevel}", prev="${currentProgress}"`);

  // ── Reason ───────────────────────────────────────────────────────────────
  let decision;
  if (performanceLevel === 'weak') {
    decision = 'regenerate_flashcards';
  } else if (performanceLevel === 'medium') {
    decision = 'regenerate_test';
  } else {
    decision = 'advance_topic';
  }

  console.log(`[Agent] Reason → Plan: decided "${decision}"`);

  // ── Act ───────────────────────────────────────────────────────────────────
  let result = { action: decision, topicName };

  if (decision === 'regenerate_flashcards') {
    // Act: generate targeted flashcards focused on weak areas
    const weakAreas = currentPerf.weakAreas || [];
    const flashcards = await generateFlashcards(
      topicName,
      topic.summary + (weakAreas.length ? ` Focus on: ${weakAreas.join(', ')}` : ''),
      session.pdfText
    );
    session.flashcards[topicName] = flashcards;
    result = {
      action: 'show_flashcards',
      topicName,
      flashcards,
      message: `You need more practice on "${topicName}". Review these focused flashcards, then try the test again.`,
      recommendation: 'Study the flashcards carefully, then re-take the test.',
    };
  } else if (decision === 'regenerate_test') {
    // Act: generate a fresh test, focusing on weak areas
    const questions = await generateTest(
      topicName,
      topic.summary,
      currentPerf.weakAreas || [],
      session.pdfText
    );
    session.tests[topicName] = questions;
    result = {
      action: 'take_test',
      topicName,
      questions,
      message: `Good progress on "${topicName}"! Let's reinforce with another test.`,
      recommendation: 'You\'re getting there — one more test to solidify understanding.',
    };
  } else {
    // Act: mark topic complete, find next topic
    session.progress[topicName] = 'strong';
    const nextTopic = findNextTopic(session, topicName);
    result = {
      action: 'next_topic',
      topicName,
      nextTopic: nextTopic ? nextTopic.name : null,
      message: `Excellent! You've mastered "${topicName}".`,
      recommendation: nextTopic
        ? `Move on to "${nextTopic.name}" (${nextTopic.priority} priority)`
        : 'You have completed all topics! 🎉',
    };
  }

  // ── Observe ──────────────────────────────────────────────────────────────
  session.progress[topicName] = performanceLevel;
  session.agentState = decision;
  console.log(`[Agent] Observe: updated progress for "${topicName}" → ${performanceLevel}`);

  return result;
}

/**
 * Find the next unmastered topic ordered by priority
 */
function findNextTopic(session, currentTopicName) {
  return session.topics.find(
    (t) => t.name !== currentTopicName && session.progress[t.name] !== 'strong'
  );
}

module.exports = {
  extractTopics,
  rankTopics,
  generateFlashcards,
  generateTest,
  evaluateAnswers,
  agentLoop,
};
