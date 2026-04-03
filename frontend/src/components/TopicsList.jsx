// TopicsList.jsx — Display ranked topics with priority labels and progress
import React from 'react';

const PRIORITY_ICONS = { High: '🔴', Medium: '🟠', Low: '🟢' };
const PROGRESS_LABELS = {
  strong: { label: 'Mastered', cls: 'badge-strong' },
  medium: { label: 'In Progress', cls: 'badge-medium-perf' },
  weak: { label: 'Needs Work', cls: 'badge-weak' },
  pending: { label: 'Not Started', cls: 'badge-pending' },
};

export default function TopicsList({ topics, progress, onSelectTopic, selectedTopic }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18 }}>📚 Study Topics</h2>
        <span style={{ color: 'var(--text-dim)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
          {topics.length} topics found
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {topics.map((topic, i) => {
          const prog = progress[topic.name] || 'pending';
          const { label, cls } = PROGRESS_LABELS[prog] || PROGRESS_LABELS.pending;
          const isSelected = selectedTopic === topic.name;

          return (
            <div
              key={topic.name}
              className="card"
              onClick={() => onSelectTopic(topic.name)}
              style={{
                cursor: 'pointer',
                border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                background: isSelected ? 'rgba(124,111,247,0.06)' : 'var(--surface)',
                transition: 'all var(--transition)',
                animationDelay: `${i * 0.06}s`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>
                      {PRIORITY_ICONS[topic.priority]} {topic.name}
                    </span>
                    <span className={`badge badge-${topic.priority.toLowerCase()}`}>
                      {topic.priority}
                    </span>
                    <span className={`badge ${cls}`}>{label}</span>
                  </div>
                  <p style={{ color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.4 }}>
                    {topic.summary}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
                  {[
                    { label: 'Imp', value: topic.importance },
                    { label: 'Diff', value: topic.difficulty },
                    { label: 'Freq', value: topic.frequency },
                  ].map(({ label: l, value }) => (
                    <div key={l} style={{ textAlign: 'center' }}>
                      <div style={{
                        fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 600,
                        color: value >= 8 ? 'var(--red)' : value >= 6 ? 'var(--orange)' : 'var(--green)'
                      }}>{value}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Score bar */}
              <div style={{ marginTop: 10 }}>
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{
                    width: `${topic.priorityScore * 10}%`,
                    background: topic.priority === 'High'
                      ? 'linear-gradient(90deg, var(--red), var(--orange))'
                      : topic.priority === 'Medium'
                      ? 'linear-gradient(90deg, var(--orange), var(--gold))'
                      : 'linear-gradient(90deg, var(--green), #86efac)'
                  }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
