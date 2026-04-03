// server.js — Express backend for Autonomous Study Agent
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdf = require('pdf-parse');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const { getSession, updateSession, getPerformanceSummary } = require('./store');
const {
  extractTopics,
  rankTopics,
  generateFlashcards,
  generateTest,
  evaluateAnswers,
  agentLoop,
} = require('./agentFunctions');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Multer: store uploads in memory (no disk persistence needed)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  },
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Autonomous Study Agent backend running' });
});

// ─── POST /upload-pdf ─────────────────────────────────────────────────────────
// Perceive phase: read and extract text from the uploaded PDF
app.post('/upload-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded' });

    // Extract text from PDF buffer
    const data = await pdf(req.file.buffer);
    const pdfText = data.text;

    if (!pdfText || pdfText.trim().length < 50) {
      return res.status(400).json({ error: 'PDF appears to be empty or unreadable' });
    }

    // Create a new session for this study session
    const sessionId = uuidv4();
    const session = getSession(sessionId);
    session.pdfText = pdfText;
    session.fileName = req.file.originalname;

    res.json({
      sessionId,
      fileName: req.file.originalname,
      wordCount: pdfText.split(/\s+/).length,
      preview: pdfText.slice(0, 500) + '...',
      message: 'PDF uploaded and text extracted successfully',
    });
  } catch (err) {
    console.error('[/upload-pdf]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /extract-topics ─────────────────────────────────────────────────────
// Act phase: call AI to identify key topics from the text
app.post('/extract-topics', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = getSession(sessionId);

    if (!session.pdfText) {
      return res.status(400).json({ error: 'No PDF text found. Upload a PDF first.' });
    }

    const topics = await extractTopics(session.pdfText);
    session.topics = topics;

    res.json({ topics, count: topics.length });
  } catch (err) {
    console.error('[/extract-topics]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /rank-topics ────────────────────────────────────────────────────────
// Reason phase: rank topics by importance, difficulty, and frequency
app.post('/rank-topics', async (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = getSession(sessionId);

    if (!session.topics.length) {
      return res.status(400).json({ error: 'No topics found. Extract topics first.' });
    }

    const rankedTopics = rankTopics(session.topics);
    session.topics = rankedTopics;

    // Initialize progress tracking
    rankedTopics.forEach((t) => {
      if (!session.progress[t.name]) session.progress[t.name] = 'pending';
    });

    res.json({ topics: rankedTopics });
  } catch (err) {
    console.error('[/rank-topics]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /generate-flashcards ───────────────────────────────────────────────
// Act phase: generate active recall flashcards for a topic
app.post('/generate-flashcards', async (req, res) => {
  try {
    const { sessionId, topicName } = req.body;
    const session = getSession(sessionId);

    const topic = session.topics.find((t) => t.name === topicName);
    if (!topic) return res.status(404).json({ error: 'Topic not found' });

    const flashcards = await generateFlashcards(topicName, topic.summary, session.pdfText);
    session.flashcards[topicName] = flashcards;

    res.json({ topicName, flashcards, count: flashcards.length });
  } catch (err) {
    console.error('[/generate-flashcards]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /generate-test ──────────────────────────────────────────────────────
// Act phase: generate a MCQ test for a topic
app.post('/generate-test', async (req, res) => {
  try {
    const { sessionId, topicName } = req.body;
    const session = getSession(sessionId);

    const topic = session.topics.find((t) => t.name === topicName);
    if (!topic) return res.status(404).json({ error: 'Topic not found' });

    const weakAreas = session.performance[topicName]?.weakAreas || [];
    const questions = await generateTest(topicName, topic.summary, weakAreas, session.pdfText);
    session.tests[topicName] = questions;

    // Send questions WITHOUT the correct answers to the frontend
    const safeQuestions = questions.map(({ correctAnswer, explanation, ...rest }) => rest);

    res.json({ topicName, questions: safeQuestions, count: safeQuestions.length });
  } catch (err) {
    console.error('[/generate-test]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /evaluate-answers ───────────────────────────────────────────────────
// Observe phase: evaluate user's test answers and score their performance
app.post('/evaluate-answers', async (req, res) => {
  try {
    const { sessionId, topicName, userAnswers } = req.body;
    // userAnswers: { q1: "answer text", q2: "answer text", ... }
    const session = getSession(sessionId);

    const questions = session.tests[topicName];
    if (!questions) return res.status(400).json({ error: 'No test found for this topic. Generate a test first.' });

    const evaluation = await evaluateAnswers(questions, userAnswers);

    // Store performance data
    session.performance[topicName] = {
      score: evaluation.score,
      level: evaluation.level,
      weakAreas: evaluation.weakAreas,
      attempts: (session.performance[topicName]?.attempts || 0) + 1,
      lastScore: evaluation.score,
    };
    session.progress[topicName] = evaluation.level;

    res.json({
      topicName,
      ...evaluation,
      attempts: session.performance[topicName].attempts,
    });
  } catch (err) {
    console.error('[/evaluate-answers]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /agent-loop ─────────────────────────────────────────────────────────
// The full perceive→reason→plan→act→observe cycle
// Determines what the student should do next based on their performance
app.post('/agent-loop', async (req, res) => {
  try {
    const { sessionId, topicName, performanceLevel } = req.body;
    const session = getSession(sessionId);

    const agentDecision = await agentLoop(session, topicName, performanceLevel);
    const summary = getPerformanceSummary(sessionId);

    res.json({
      ...agentDecision,
      progressSummary: summary,
      allProgress: session.progress,
    });
  } catch (err) {
    console.error('[/agent-loop]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /session/:sessionId ──────────────────────────────────────────────────
// Get current session state (for reconnecting)
app.get('/session/:sessionId', (req, res) => {
  const session = getSession(req.params.sessionId);
  const summary = getPerformanceSummary(req.params.sessionId);
  res.json({
    sessionId: session.id,
    fileName: session.fileName,
    topics: session.topics,
    progress: session.progress,
    performance: session.performance,
    progressSummary: summary,
    agentState: session.agentState,
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🤖 Autonomous Study Agent Backend`);
  console.log(`   Running on: http://localhost:${PORT}`);
  console.log(`   OpenAI Key: ${process.env.OPENAI_API_KEY ? '✅ Configured' : '⚠️  Using mock data'}\n`);
});
