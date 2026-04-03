// TestView.jsx — MCQ test interface with answer tracking
import React, { useState } from 'react';
import { evaluateAnswers, runAgentLoop } from '../utils/api';

const DIFF_COLORS = { easy: 'var(--green)', medium: 'var(--orange)', hard: 'var(--red)' };

export default function TestView({ sessionId, topicName, questions, onResult }) {
  const [answers, setAnswers] = useState({}); // { questionId: selectedOption }
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const total = questions.length;
  const answered = Object.keys(answers).length;

  const handleSelect = (qId, option) => {
    setAnswers(prev => ({ ...prev, [qId]: option }));
  };

  const handleSubmit = async () => {
    if (answered < total) {
      setError(`Please answer all ${total} questions before submitting.`);
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      // 1. Evaluate answers
      const evalRes = await evaluateAnswers(sessionId, topicName, answers);
      const evaluation = evalRes.data;

      // 2. Run agent loop to decide next action
      const agentRes = await runAgentLoop(sessionId, topicName, evaluation.level);
      const agentDecision = agentRes.data;

      onResult({ evaluation, agentDecision });
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fade-up">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, marginBottom: 2 }}>📝 Mock Test</h2>
          <div style={{ color: 'var(--text-dim)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
            {topicName} · {answered}/{total} answered
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="progress-bar" style={{ width: 120, marginBottom: 4 }}>
            <div className="progress-bar-fill" style={{ width: `${(answered / total) * 100}%` }} />
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{total} questions</span>
        </div>
      </div>

      {/* Questions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 20 }}>
        {questions.map((q, qi) => (
          <div key={q.id} className="card" style={{ padding: 20 }}>
            {/* Question header */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'flex-start' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', background: 'var(--surface3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, flexShrink: 0,
                color: answers[q.id] ? 'var(--accent)' : 'var(--text-dim)'
              }}>
                {qi + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <span style={{
                    fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                    letterSpacing: '0.05em', color: DIFF_COLORS[q.difficulty]
                  }}>● {q.difficulty}</span>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, lineHeight: 1.5 }}>
                  {q.question}
                </div>
              </div>
            </div>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(q.options || []).map((option, oi) => {
                const labels = ['A', 'B', 'C', 'D'];
                const selected = answers[q.id] === option;
                return (
                  <button
                    key={oi}
                    onClick={() => handleSelect(q.id, option)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                      border: selected ? '1px solid var(--accent)' : '1px solid var(--border)',
                      background: selected ? 'rgba(124,111,247,0.08)' : 'var(--surface2)',
                      cursor: 'pointer', textAlign: 'left', transition: 'all var(--transition)',
                      color: selected ? 'var(--accent)' : 'var(--text)',
                    }}
                  >
                    <span style={{
                      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600,
                      background: selected ? 'var(--accent)' : 'var(--surface3)',
                      color: selected ? '#fff' : 'var(--text-dim)',
                    }}>
                      {labels[oi]}
                    </span>
                    <span style={{ fontSize: 14, lineHeight: 1.4 }}>{option}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div style={{
          background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)',
          borderRadius: 'var(--radius-sm)', padding: '10px 16px', marginBottom: 16,
          color: 'var(--red)', fontSize: 13
        }}>⚠️ {error}</div>
      )}

      <button
        className="btn btn-primary"
        style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15 }}
        onClick={handleSubmit}
        disabled={submitting}
      >
        {submitting ? <><span className="spinner" /> Evaluating your answers…</> : '✅ Submit Test'}
      </button>
    </div>
  );
}
