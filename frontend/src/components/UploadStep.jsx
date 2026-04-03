// UploadStep.jsx — PDF upload with drag & drop
import React, { useState, useRef } from 'react';
import { uploadPDF, extractTopics, rankTopics } from '../utils/api';

export default function UploadStep({ onComplete }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('idle'); // idle | uploading | extracting | done | error
  const [error, setError] = useState('');
  const inputRef = useRef();

  const handleFile = (f) => {
    if (!f || f.type !== 'application/pdf') {
      setError('Please upload a valid PDF file.');
      return;
    }
    setFile(f);
    setError('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleProcess = async () => {
    if (!file) return;
    setError('');
    setStage('uploading');

    try {
      // 1. Upload PDF and extract text
      const uploadRes = await uploadPDF(file, setProgress);
      const { sessionId, fileName, wordCount } = uploadRes.data;
      setStage('extracting');

      // 2. Extract topics from text using AI
      await extractTopics(sessionId);

      // 3. Rank topics by importance/difficulty
      const rankRes = await rankTopics(sessionId);

      setStage('done');
      onComplete({ sessionId, fileName, wordCount, topics: rankRes.data.topics });
    } catch (err) {
      setStage('error');
      setError(err.response?.data?.error || err.message || 'Something went wrong');
    }
  };

  const stageLabels = {
    uploading: `Uploading… ${progress}%`,
    extracting: 'AI is analyzing your document…',
    done: 'Complete!',
    error: 'Error occurred',
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }} className="fade-up">
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,111,247,0.3) 0%, transparent 70%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', fontSize: 32, border: '1px solid rgba(124,111,247,0.3)'
        }}>🤖</div>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>Autonomous Study Agent</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: 15 }}>
          Upload a PDF and let the AI build your personalized study plan
        </p>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? 'var(--accent)' : file ? 'var(--green)' : 'var(--border)'}`,
          borderRadius: 'var(--radius)',
          padding: '48px 32px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? 'rgba(124,111,247,0.05)' : file ? 'rgba(74,222,128,0.03)' : 'var(--surface)',
          transition: 'all var(--transition)',
          marginBottom: 16,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files[0])}
        />
        <div style={{ fontSize: 40, marginBottom: 12 }}>
          {file ? '📄' : '☁️'}
        </div>
        {file ? (
          <>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 4 }}>
              {file.name}
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>
              {(file.size / 1024 / 1024).toFixed(2)} MB · Click to change
            </div>
          </>
        ) : (
          <>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 4 }}>
              Drop your PDF here
            </div>
            <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>or click to browse files</div>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)',
          borderRadius: 'var(--radius-sm)', padding: '10px 16px', marginBottom: 16,
          color: 'var(--red)', fontSize: 13
        }}>⚠️ {error}</div>
      )}

      {/* Progress */}
      {stage !== 'idle' && stage !== 'error' && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>
            <span>{stageLabels[stage]}</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: stage === 'extracting' ? '70%' : stage === 'done' ? '100%' : `${progress}%` }} />
          </div>
        </div>
      )}

      {/* CTA */}
      <button
        className="btn btn-primary"
        style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15 }}
        disabled={!file || (stage !== 'idle' && stage !== 'error')}
        onClick={handleProcess}
      >
        {stage === 'uploading' || stage === 'extracting' ? (
          <><span className="spinner" /> {stageLabels[stage]}</>
        ) : '🚀 Analyze PDF & Extract Topics'}
      </button>

      {/* Info pills */}
      <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
        {['AI Topic Extraction', 'Smart Flashcards', 'Adaptive Testing', 'Agent Loop'].map(f => (
          <span key={f} style={{
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: 20, padding: '4px 12px', fontSize: 12, color: 'var(--text-dim)'
          }}>✦ {f}</span>
        ))}
      </div>
    </div>
  );
}
