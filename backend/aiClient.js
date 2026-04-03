// aiClient.js — OpenAI client setup and tool/function definitions
require('dotenv').config();
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'mock',
});

// ─── Tool definitions for function calling ───────────────────────────────────

const TOOLS = {
  extractTopics: {
    type: 'function',
    function: {
      name: 'extractTopics',
      description: 'Extract key topics from study material text',
      parameters: {
        type: 'object',
        properties: {
          topics: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Topic name' },
                frequency: { type: 'number', description: 'How often it appears (1-10)' },
                importance: { type: 'number', description: 'How important (1-10)' },
                difficulty: { type: 'number', description: 'How difficult (1-10)' },
                summary: { type: 'string', description: 'Brief 1-sentence summary' },
              },
              required: ['name', 'frequency', 'importance', 'difficulty', 'summary'],
            },
          },
        },
        required: ['topics'],
      },
    },
  },

  generateFlashcards: {
    type: 'function',
    function: {
      name: 'generateFlashcards',
      description: 'Generate Q&A flashcards for active recall',
      parameters: {
        type: 'object',
        properties: {
          flashcards: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                question: { type: 'string' },
                answer: { type: 'string' },
                hint: { type: 'string', description: 'A subtle hint to help recall' },
              },
              required: ['question', 'answer', 'hint'],
            },
          },
        },
        required: ['flashcards'],
      },
    },
  },

  generateTest: {
    type: 'function',
    function: {
      name: 'generateTest',
      description: 'Generate a multiple-choice test with difficulty levels',
      parameters: {
        type: 'object',
        properties: {
          questions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                question: { type: 'string' },
                options: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Exactly 4 options (A, B, C, D)',
                },
                correctAnswer: { type: 'string', description: 'The correct option text' },
                difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
                explanation: { type: 'string', description: 'Why this is the correct answer' },
              },
              required: ['id', 'question', 'options', 'correctAnswer', 'difficulty', 'explanation'],
            },
          },
        },
        required: ['questions'],
      },
    },
  },

  evaluateAnswers: {
    type: 'function',
    function: {
      name: 'evaluateAnswers',
      description: 'Evaluate user answers and identify weak areas',
      parameters: {
        type: 'object',
        properties: {
          score: { type: 'number', description: 'Score as percentage 0-100' },
          level: { type: 'string', enum: ['weak', 'medium', 'strong'] },
          feedback: { type: 'string', description: 'Overall feedback message' },
          weakAreas: {
            type: 'array',
            items: { type: 'string' },
            description: 'Subtopics or concepts the user struggled with',
          },
          questionResults: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                questionId: { type: 'string' },
                correct: { type: 'boolean' },
                explanation: { type: 'string' },
              },
            },
          },
        },
        required: ['score', 'level', 'feedback', 'weakAreas', 'questionResults'],
      },
    },
  },
};

/**
 * Call OpenAI with tool use and return the parsed tool result.
 * Falls back to mock data if no API key.
 */
async function callWithTool(systemPrompt, userPrompt, toolName) {
  // If no real API key, return mock data
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'mock') {
    return getMockData(toolName, userPrompt);
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      tools: [TOOLS[toolName]],
      tool_choice: { type: 'function', function: { name: toolName } },
    });

    const toolCall = response.choices[0].message.tool_calls?.[0];
    if (!toolCall) throw new Error('No tool call returned');

    return JSON.parse(toolCall.function.arguments);
  } catch (err) {
    console.error(`OpenAI call failed for ${toolName}:`, err.message);
    // Fallback to mock on error
    return getMockData(toolName, userPrompt);
  }
}

// ─── Mock data for demo/testing without API key ──────────────────────────────

function getMockData(toolName, prompt) {
  const topicHint = extractTopicFromPrompt(prompt);

  if (toolName === 'extractTopics') {
    return {
      topics: [
        { name: 'Neural Networks', frequency: 9, importance: 10, difficulty: 8, summary: 'Computational models inspired by the human brain that learn from data.' },
        { name: 'Gradient Descent', frequency: 8, importance: 9, difficulty: 7, summary: 'Optimization algorithm used to minimize loss functions in ML models.' },
        { name: 'Backpropagation', frequency: 7, importance: 9, difficulty: 9, summary: 'Algorithm for computing gradients in neural networks via chain rule.' },
        { name: 'Activation Functions', frequency: 6, importance: 8, difficulty: 6, summary: 'Non-linear functions that determine neuron output in a network.' },
        { name: 'Overfitting & Regularization', frequency: 7, importance: 8, difficulty: 7, summary: 'Problem of memorizing training data and techniques to prevent it.' },
        { name: 'Convolutional Neural Networks', frequency: 5, importance: 8, difficulty: 8, summary: 'Specialized networks for processing grid-like data such as images.' },
      ],
    };
  }

  if (toolName === 'generateFlashcards') {
    return {
      flashcards: [
        { question: `What is the core idea behind ${topicHint}?`, answer: `${topicHint} is a foundational concept that involves understanding the relationship between inputs and outputs through mathematical transformations.`, hint: 'Think about how data flows through a system.' },
        { question: `What problem does ${topicHint} solve?`, answer: `It solves the challenge of approximating complex functions by learning patterns directly from data.`, hint: 'Consider what would happen without this technique.' },
        { question: `Name two key components of ${topicHint}.`, answer: `Weights (learnable parameters) and activation functions (non-linear transformations).`, hint: 'One is learned, one is chosen.' },
        { question: `How does ${topicHint} relate to optimization?`, answer: `It provides a framework where parameters are updated iteratively to minimize a loss function.`, hint: 'Think gradient descent.' },
        { question: `What is the biggest limitation of ${topicHint}?`, answer: `High computational cost and the need for large amounts of labeled training data.`, hint: 'Resources: time and data.' },
      ],
    };
  }

  if (toolName === 'generateTest') {
    return {
      questions: [
        {
          id: 'q1',
          question: `Which of the following best describes ${topicHint}?`,
          options: ['A method for data compression', 'A technique for learning patterns from data', 'A database query language', 'A network communication protocol'],
          correctAnswer: 'A technique for learning patterns from data',
          difficulty: 'easy',
          explanation: `${topicHint} fundamentally involves learning patterns and representations from raw data.`,
        },
        {
          id: 'q2',
          question: `What mathematical concept is central to ${topicHint}?`,
          options: ['Matrix multiplication and chain rule', 'Fourier transforms', 'Bayesian statistics only', 'Integer linear programming'],
          correctAnswer: 'Matrix multiplication and chain rule',
          difficulty: 'medium',
          explanation: 'Matrix multiplication handles the forward pass, and the chain rule enables gradient computation in backpropagation.',
        },
        {
          id: 'q3',
          question: `In the context of ${topicHint}, what does "overfitting" mean?`,
          options: ['The model trains too slowly', 'The model memorizes training data and fails to generalize', 'The model has too few parameters', 'The loss function diverges'],
          correctAnswer: 'The model memorizes training data and fails to generalize',
          difficulty: 'medium',
          explanation: 'Overfitting occurs when a model learns the noise in training data rather than the underlying signal.',
        },
        {
          id: 'q4',
          question: `Which regularization technique directly penalizes large weights in ${topicHint}?`,
          options: ['Dropout', 'Batch normalization', 'L2 regularization (weight decay)', 'Data augmentation'],
          correctAnswer: 'L2 regularization (weight decay)',
          difficulty: 'hard',
          explanation: 'L2 regularization adds a penalty term proportional to the square of weight magnitudes to the loss function.',
        },
        {
          id: 'q5',
          question: `What is the role of the learning rate in ${topicHint}?`,
          options: [
            'It controls how many layers the network has',
            'It determines how much weights are updated per training step',
            'It sets the number of training epochs',
            'It defines the batch size',
          ],
          correctAnswer: 'It determines how much weights are updated per training step',
          difficulty: 'easy',
          explanation: 'The learning rate is a hyperparameter controlling the step size during gradient descent optimization.',
        },
      ],
    };
  }

  if (toolName === 'evaluateAnswers') {
    return {
      score: 60,
      level: 'medium',
      feedback: 'Good effort! You have a solid foundational understanding but need to work on the harder concepts.',
      weakAreas: ['Regularization techniques', 'Advanced optimization'],
      questionResults: [
        { questionId: 'q1', correct: true, explanation: 'Correct! You understood the core concept.' },
        { questionId: 'q2', correct: true, explanation: 'Correct! Good grasp of the math.' },
        { questionId: 'q3', correct: false, explanation: 'Overfitting means memorizing training data, not just slow training.' },
        { questionId: 'q4', correct: false, explanation: 'L2 regularization is the correct technique here, not Dropout.' },
        { questionId: 'q5', correct: true, explanation: 'Correct! Learning rate controls weight update step size.' },
      ],
    };
  }

  return {};
}

function extractTopicFromPrompt(prompt) {
  const match = prompt.match(/topic[:\s"']+([^"'\n.]+)/i);
  return match ? match[1].trim() : 'Machine Learning';
}

module.exports = { callWithTool };
