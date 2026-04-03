// api.js — Centralized API calls to the backend
import axios from 'axios';

const BASE = '';  // Uses CRA proxy → http://localhost:3001

const api = axios.create({ baseURL: BASE });

export const uploadPDF = (file, onProgress) => {
  const form = new FormData();
  form.append('pdf', file);
  return api.post('/upload-pdf', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => onProgress && onProgress(Math.round((e.loaded * 100) / e.total)),
  });
};

export const extractTopics = (sessionId) =>
  api.post('/extract-topics', { sessionId });

export const rankTopics = (sessionId) =>
  api.post('/rank-topics', { sessionId });

export const generateFlashcards = (sessionId, topicName) =>
  api.post('/generate-flashcards', { sessionId, topicName });

export const generateTest = (sessionId, topicName) =>
  api.post('/generate-test', { sessionId, topicName });

export const evaluateAnswers = (sessionId, topicName, userAnswers) =>
  api.post('/evaluate-answers', { sessionId, topicName, userAnswers });

export const runAgentLoop = (sessionId, topicName, performanceLevel) =>
  api.post('/agent-loop', { sessionId, topicName, performanceLevel });

export const getSession = (sessionId) =>
  api.get(`/session/${sessionId}`);
