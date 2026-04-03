// ResultsView.jsx — Test results + agent recommendation dashboard
import React from 'react';

const LEVEL_CONFIG = {
  strong: { emoji: '🏆', label: 'Strong', color: 'var(--green)', bg: 'rgba(74,222,128,0.06)', border: 'rgba(74,222,128,0.3)' },
  medium: { emoji: '📈', label: 'Progressing', color: 'var(--orange)', bg: 'rgba(251,146,60,0.06)', border: 'rgba(251,146,60,0.3)' },
  weak: { emoji: '💪', label: 'Needs Practice', color: 'var(--red)', bg: 'rgba(248,113,113,0.06)', border: 'rgba(248,113,113,0.3)' },
};

const ACTION_ICONS = {
  show_flashcards: '🃏',
  take_test: '📝',
  next_topic: '⏭️',
};

export default function ResultsView({
  topicName,
  evaluation,   // { score, level, feedback, weakAreas, questionResults }
  agentDecision, // { action, message, recommendation, nextTopic, flashcards, questions }
  onFollowAgent,
  onBackToTopics,
  progressSummary,
}) {
  const cfg = LEVEL_CONFIG[evaluation.level] || LEVEL_CONFIG.medium;
  const scoreRounded = Math.round(evaluation.score);

  // Draw score arc SVG
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (scoreRounded / 100) * circumference;

  return (
    <div className="fade-up">
      {/* Score hero */}
      <div style={{
        background: cfg.bg, border: `1px solid ${cfg.border}`,
        borderRadius: 'var(--radius)', padding: 32, marginBottom: 16,
        display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap',
      }}>
        {/* SVG arc score */}
        <div style={{ position: 'relative', width: 130, height: 130, flexShrink: 0 }}>
          <svg width="130" height="130" viewBox="0 0 130 130" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="65" cy="65" r={radius} fill="none" stroke="var(--surface3)" strokeWidth="8" />
            <circle
              cx="65" cy="65" r={radius} fill="none"
              stroke={cfg.color} strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s ease' }}
            />
          </svg>
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ fontSize: 28, fontFamily: 'var(--font-display)', fontWeight: 800, color: cfg.color }}>
              {scoreRounded}%
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>score</div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 24 }}>{cfg.emoji}</span>
            <h2 style={{ fontSize: 22 }}>{cfg.label}</h2>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>
            {topicName}
          </div>
          <p style={{ color: 'var(--text)', fontSize: 14, lineHeight: 1.6 }}>
            {evaluation.feedback}
          </p>
        </div>
      </div>

      {/* Per-question breakdown */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, marginBottom: 12 }}>Question Breakdown</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(evaluation.questionResults || []).map((qr, i) => (
            <div key={qr.questionId} style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              padding: '8px 0', borderBottom: i < evaluation.questionResults.length - 1 ? '1px solid var(--border)' : 'none'
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{qr.correct ? '✅' : '❌'}</span>
              <div>
                <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', marginBottom: 2 }}>
                  Question {i + 1}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text)' }}>{qr.explanation}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weak areas */}
      {evaluation.weakAreas?.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, marginBottom: 10 }}>⚠️ Areas to Strengthen</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {evaluation.weakAreas.map(area => (
              <span key={area} className="badge badge-weak">{area}</span>
            ))}
          </div>
        </div>
      )}

      {/* Agent Recommendation */}
      <div style={{
        background: 'rgba(124,111,247,0.06)', border: '1px solid rgba(124,111,247,0.3)',
        borderRadius: 'var(--radius)', padding: 20, marginBottom: 20,
      }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ fontSize: 28 }}>{ACTION_ICONS[agentDecision.action] || '🤖'}</div>
          <div>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
              🤖 Agent Recommendation
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
              {agentDecision.message}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
              {agentDecision.recommendation}
            </div>
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => onFollowAgent(agentDecision)}
          style={{ fontSize: 14 }}
        >
          Follow Agent's Plan →
        </button>
      </div>

      {/* Overall progress summary */}
      {progressSummary && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, marginBottom: 12 }}>📊 Overall Progress</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { label: 'Strong', key: 'strong', color: 'var(--green)' },
              { label: 'Medium', key: 'medium', color: 'var(--orange)' },
              { label: 'Weak', key: 'weak', color: 'var(--red)' },
              { label: 'Pending', key: 'pending', color: 'var(--text-faint)' },
            ].map(({ label, key, color }) => (
              <div key={key} style={{
                flex: 1, minWidth: 70, textAlign: 'center',
                padding: '12px 8px', background: 'var(--surface2)',
                borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)'
              }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 600, color }}>
                  {progressSummary[key] || 0}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button className="btn btn-ghost" onClick={onBackToTopics} style={{ fontSize: 13 }}>
        ← Back to all topics
      </button>
    </div>
  );
}
