// store.js — Simple in-memory data store for sessions
// Stores: extracted topics, user performance, progress, flashcards, tests

const sessions = {};

/**
 * Create or retrieve a session by ID
 */
function getSession(sessionId) {
  if (!sessions[sessionId]) {
    sessions[sessionId] = {
      id: sessionId,
      pdfText: '',
      topics: [],           // [{ name, importance, frequency, difficulty, priority }]
      flashcards: {},       // { topicName: [{ question, answer }] }
      tests: {},            // { topicName: [{ question, options, answer, difficulty }] }
      performance: {},      // { topicName: { score, attempts, weakAreas } }
      progress: {},         // { topicName: 'weak' | 'medium' | 'strong' | 'pending' }
      currentTopic: null,
      agentState: 'idle',   // idle | extracting | testing | reviewing
    };
  }
  return sessions[sessionId];
}

function updateSession(sessionId, updates) {
  const session = getSession(sessionId);
  Object.assign(session, updates);
  return session;
}

function getPerformanceSummary(sessionId) {
  const session = getSession(sessionId);
  const summary = {
    total: session.topics.length,
    strong: 0,
    medium: 0,
    weak: 0,
    pending: 0,
  };
  for (const topic of session.topics) {
    const status = session.progress[topic.name] || 'pending';
    summary[status] = (summary[status] || 0) + 1;
  }
  return summary;
}

module.exports = { getSession, updateSession, getPerformanceSummary };
