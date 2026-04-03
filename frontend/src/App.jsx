// App.jsx — Main application: orchestrates the full study agent flow
import React, { useState } from 'react';
import UploadStep from './components/UploadStep';
import TopicsList from './components/TopicsList';
import FlashcardsView from './components/FlashcardsView';
import TestView from './components/TestView';
import ResultsView from './components/ResultsView';
import { generateFlashcards, generateTest } from './utils/api';

// Steps in the agent flow
const STEP = {
  UPLOAD: 'upload',
  TOPICS: 'topics',
  FLASHCARDS: 'flashcards',
  TEST: 'test',
  RESULTS: 'results',
};

export default function App() {
  const [step, setStep] = useState(STEP.UPLOAD);
  const [sessionId, setSessionId] = useState(null);
  const [fileName, setFileName] = useState('');
  const [topics, setTopics] = useState([]);
  const [progress, setProgress] = useState({});
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [flashcards, setFlashcards] = useState([]);
  const [testQuestions, setTestQuestions] = useState([]);
  const [evaluation, setEvaluation] = useState(null);
  const [agentDecision, setAgentDecision] = useState(null);
  const [progressSummary, setProgressSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');

  // ── After PDF upload → go to topics view ──────────────────────────────────
  const handleUploadComplete = ({ sessionId, fileName, topics }) => {
    setSessionId(sessionId);
    setFileName(fileName);
    setTopics(topics);
    const initialProgress = {};
    topics.forEach(t => { initialProgress[t.name] = 'pending'; });
    setProgress(initialProgress);
    setStep(STEP.TOPICS);
  };

  // ── User clicks a topic → load flashcards ─────────────────────────────────
  const handleSelectTopic = async (topicName) => {
    setSelectedTopic(topicName);
    setLoading(true);
    setLoadingMsg(`Generating flashcards for "${topicName}"…`);

    try {
      const res = await generateFlashcards(sessionId, topicName);
      setFlashcards(res.data.flashcards);
      setStep(STEP.FLASHCARDS);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  };

  // ── Flashcard "Take Test" → load test questions ────────────────────────────
  const handleStartTest = async () => {
    setLoading(true);
    setLoadingMsg(`Generating test for "${selectedTopic}"…`);

    try {
      const res = await generateTest(sessionId, selectedTopic);
      setTestQuestions(res.data.questions);
      setStep(STEP.TEST);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  };

  // ── Test submitted → show results with agent decision ─────────────────────
  const handleTestResult = ({ evaluation, agentDecision }) => {
    setEvaluation(evaluation);
    setAgentDecision(agentDecision);
    setProgressSummary(agentDecision.progressSummary);

    // Update local progress state
    setProgress(prev => ({
      ...prev,
      [selectedTopic]: evaluation.level,
      ...(agentDecision.allProgress || {}),
    }));

    setStep(STEP.RESULTS);
  };

  // ── Follow agent recommendation ───────────────────────────────────────────
  const handleFollowAgent = async (decision) => {
    if (decision.action === 'show_flashcards') {
      // Agent decided: show regenerated flashcards
      setFlashcards(decision.flashcards || flashcards);
      setStep(STEP.FLASHCARDS);
    } else if (decision.action === 'take_test') {
      // Agent decided: take another test (already regenerated)
      setTestQuestions(decision.questions || testQuestions);
      setStep(STEP.TEST);
    } else if (decision.action === 'next_topic' && decision.nextTopic) {
      // Agent decided: move to the next topic
      await handleSelectTopic(decision.nextTopic);
    } else {
      // All done!
      setStep(STEP.TOPICS);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      {step !== STEP.UPLOAD && (
        <header style={{
          borderBottom: '1px solid var(--border)',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(10,10,15,0.9)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>🤖</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>
              Study Agent
            </span>
            {fileName && (
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)',
                background: 'var(--surface2)', padding: '2px 10px', borderRadius: 20,
                border: '1px solid var(--border)'
              }}>
                📄 {fileName}
              </span>
            )}
          </div>

          {/* Step breadcrumb */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {[
              { id: STEP.TOPICS, label: 'Topics' },
              { id: STEP.FLASHCARDS, label: 'Flashcards' },
              { id: STEP.TEST, label: 'Test' },
              { id: STEP.RESULTS, label: 'Results' },
            ].map(({ id, label }, i, arr) => (
              <React.Fragment key={id}>
                <span style={{
                  fontSize: 12, fontFamily: 'var(--font-mono)',
                  color: step === id ? 'var(--accent)' : 'var(--text-faint)',
                  fontWeight: step === id ? 600 : 400,
                }}>
                  {label}
                </span>
                {i < arr.length - 1 && (
                  <span style={{ color: 'var(--text-faint)', fontSize: 10 }}>›</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </header>
      )}

      {/* Main content */}
      <main style={{ flex: 1, padding: step === STEP.UPLOAD ? '80px 20px' : '32px 20px', maxWidth: 760, width: '100%', margin: '0 auto' }}>

        {/* Loading overlay */}
        {loading && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(10,10,15,0.85)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            zIndex: 999, backdropFilter: 'blur(8px)',
          }}>
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '32px 48px', textAlign: 'center',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            }}>
              <div style={{ position: 'relative', width: 60, height: 60, margin: '0 auto 16px' }}>
                <div className="spinner" style={{ width: 60, height: 60, borderWidth: 3 }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                  🤖
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 6 }}>
                Agent is working…
              </div>
              <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>{loadingMsg}</div>
            </div>
          </div>
        )}

        {/* Step rendering */}
        {step === STEP.UPLOAD && (
          <UploadStep onComplete={handleUploadComplete} />
        )}

        {step === STEP.TOPICS && (
          <div className="fade-up">
            <div style={{
              background: 'rgba(124,111,247,0.06)', border: '1px solid rgba(124,111,247,0.2)',
              borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 20,
              fontSize: 13, color: 'var(--text-dim)',
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              🤖 <strong style={{ color: 'var(--accent)' }}>Agent Ready.</strong> Select a topic to start your study session. High priority topics are recommended first.
            </div>
            <TopicsList
              topics={topics}
              progress={progress}
              onSelectTopic={handleSelectTopic}
              selectedTopic={selectedTopic}
            />
          </div>
        )}

        {step === STEP.FLASHCARDS && (
          <div className="fade-up">
            <button
              className="btn btn-ghost"
              onClick={() => setStep(STEP.TOPICS)}
              style={{ marginBottom: 16, fontSize: 12 }}
            >
              ← Topics
            </button>
            <FlashcardsView
              sessionId={sessionId}
              topicName={selectedTopic}
              flashcards={flashcards}
              onStartTest={handleStartTest}
            />
          </div>
        )}

        {step === STEP.TEST && (
          <div className="fade-up">
            <button
              className="btn btn-ghost"
              onClick={() => setStep(STEP.FLASHCARDS)}
              style={{ marginBottom: 16, fontSize: 12 }}
            >
              ← Flashcards
            </button>
            <TestView
              sessionId={sessionId}
              topicName={selectedTopic}
              questions={testQuestions}
              onResult={handleTestResult}
            />
          </div>
        )}

        {step === STEP.RESULTS && evaluation && (
          <ResultsView
            topicName={selectedTopic}
            evaluation={evaluation}
            agentDecision={agentDecision}
            progressSummary={progressSummary}
            onFollowAgent={handleFollowAgent}
            onBackToTopics={() => setStep(STEP.TOPICS)}
          />
        )}
      </main>

      {/* Footer agent status */}
      {step !== STEP.UPLOAD && (
        <footer style={{
          borderTop: '1px solid var(--border)', padding: '10px 24px',
          display: 'flex', gap: 16, alignItems: 'center',
          background: 'var(--surface)', fontSize: 11,
          color: 'var(--text-faint)', fontFamily: 'var(--font-mono)',
        }}>
          <span>🤖 Autonomous Study Agent</span>
          <span>·</span>
          <span>perceive → reason → plan → act → observe</span>
          <span style={{ marginLeft: 'auto' }}>
            {Object.values(progress).filter(v => v === 'strong').length} / {topics.length} mastered
          </span>
        </footer>
      )}
    </div>
  );
}
