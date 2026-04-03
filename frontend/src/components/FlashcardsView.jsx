// FlashcardsView.jsx — Flip card interface for active recall
import React, { useState } from 'react';
import { generateFlashcards } from '../utils/api';

export default function FlashcardsView({ sessionId, topicName, flashcards: initialCards, onStartTest }) {
  const [cards, setCards] = useState(initialCards || []);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [loading, setLoading] = useState(false);
  const [known, setKnown] = useState(new Set()); // track known cards

  const card = cards[index];
  const total = cards.length;

  const next = (markKnown = false) => {
    if (markKnown) setKnown(prev => new Set([...prev, index]));
    setFlipped(false);
    setShowHint(false);
    setTimeout(() => setIndex(i => Math.min(i + 1, total - 1)), 150);
  };

  const prev = () => {
    setFlipped(false);
    setShowHint(false);
    setTimeout(() => setIndex(i => Math.max(i - 1, 0)), 150);
  };

  const reload = async () => {
    setLoading(true);
    try {
      const res = await generateFlashcards(sessionId, topicName);
      setCards(res.data.flashcards);
      setIndex(0);
      setFlipped(false);
      setKnown(new Set());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!card) return <div style={{ color: 'var(--text-dim)' }}>No flashcards available.</div>;

  return (
    <div className="fade-up">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, marginBottom: 2 }}>🃏 Flashcards</h2>
          <div style={{ color: 'var(--text-dim)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
            {topicName} · {known.size}/{total} known
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={reload} disabled={loading} style={{ fontSize: 13 }}>
            {loading ? <span className="spinner" /> : '↻'} Regenerate
          </button>
          <button className="btn btn-primary" onClick={onStartTest} style={{ fontSize: 13 }}>
            📝 Take Test
          </button>
        </div>
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {cards.map((_, i) => (
          <button
            key={i}
            onClick={() => { setIndex(i); setFlipped(false); setShowHint(false); }}
            style={{
              width: 28, height: 28, borderRadius: '50%', border: 'none',
              background: i === index
                ? 'var(--accent)'
                : known.has(i)
                ? 'var(--green)'
                : 'var(--surface3)',
              cursor: 'pointer', fontSize: 11, fontFamily: 'var(--font-mono)',
              color: i === index || known.has(i) ? '#fff' : 'var(--text-dim)',
              transition: 'all var(--transition)',
            }}
          >{i + 1}</button>
        ))}
      </div>

      {/* Flip Card */}
      <div style={{ perspective: '1000px', marginBottom: 16 }}>
        <div
          onClick={() => setFlipped(f => !f)}
          style={{
            position: 'relative',
            minHeight: 240,
            cursor: 'pointer',
            transformStyle: 'preserve-3d',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            transition: 'transform 0.5s cubic-bezier(0.4, 0.2, 0.2, 1)',
          }}
        >
          {/* Front */}
          <div style={{
            position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: 32,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16
            }}>QUESTION · Click to reveal</div>
            <div style={{ fontSize: 18, fontFamily: 'var(--font-display)', fontWeight: 700, textAlign: 'center', lineHeight: 1.5 }}>
              {card.question}
            </div>
            {showHint && (
              <div style={{
                marginTop: 16, padding: '8px 16px', background: 'rgba(245,200,66,0.08)',
                border: '1px solid rgba(245,200,66,0.2)', borderRadius: 8,
                fontSize: 13, color: 'var(--gold)', fontStyle: 'italic'
              }}>
                💡 {card.hint}
              </div>
            )}
          </div>

          {/* Back */}
          <div style={{
            position: 'absolute', inset: 0,
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: 'linear-gradient(135deg, rgba(124,111,247,0.08), var(--surface))',
            border: '1px solid var(--accent)',
            borderRadius: 'var(--radius)', padding: 32,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16
            }}>ANSWER</div>
            <div style={{ fontSize: 16, textAlign: 'center', lineHeight: 1.6, color: 'var(--text)' }}>
              {card.answer}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button className="btn btn-ghost" onClick={prev} disabled={index === 0} style={{ fontSize: 13 }}>
          ← Prev
        </button>
        {!flipped && (
          <button className="btn btn-ghost" onClick={() => setShowHint(true)} style={{ fontSize: 13 }}>
            💡 Hint
          </button>
        )}
        {flipped && (
          <button
            className="btn btn-ghost"
            onClick={() => next(true)}
            style={{ fontSize: 13, flex: 1, borderColor: 'var(--green)', color: 'var(--green)' }}
          >
            ✓ Got it
          </button>
        )}
        <button className="btn btn-ghost" onClick={() => next(false)} disabled={index === total - 1} style={{ fontSize: 13, marginLeft: 'auto' }}>
          Next →
        </button>
      </div>
    </div>
  );
}
