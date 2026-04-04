# 🤖 Autonomous Study Agent

An agentic AI application that builds a personalized study plan from any PDF — implementing a full **perceive → reason → plan → act → observe** loop.

---
[Watch Demo Video]([https://www.loom.com/share/7868cf4e764749d58ad900c19f24bbb5])

## ✨ Features

| Feature | Description |
|---|---|
| 📄 PDF Upload | Upload any study PDF; text extracted automatically |
| 🧠 Topic Extraction | AI identifies 4–8 key topics with metadata |
| 📊 Topic Ranking | Topics ranked High / Medium / Low by importance × difficulty × frequency |
| 🃏 Flashcards | Active recall Q&A cards with hints and flip animation |
| 📝 Mock Tests | 5 MCQ questions per topic across easy/medium/hard difficulty |
| 🎯 Evaluation | AI scores answers and identifies weak areas |
| 🤖 Agent Loop | Adaptive: weak→flashcards, medium→retest, strong→next topic |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 9+
- OpenAI API key (optional — falls back to rich mock data)

### 1. Clone & Install

```bash
git clone https://github.com/supreetvardhamane/autonomous-study-agent.git
cd autonomous-study-agent

# Install all dependencies (root + backend + frontend)
npm run install:all
```

### 2. Configure Environment

```bash
cp backend/.env.example backend/.env
# Edit backend/.env and add your OpenAI API key:
# OPENAI_API_KEY=sk-...
```

> **No API key?** The app works fully with realistic mock data. Just leave `OPENAI_API_KEY` blank.

### 3. Start the App

```bash
# Start both backend (port 3001) and frontend (port 3000) together:
npm start

# Or start separately:
npm run start:backend   # Terminal 1
npm run start:frontend  # Terminal 2
```

### 4. Open in Browser

```
http://localhost:3000
```

---

## 📁 Folder Structure

```
autonomous-study-agent/
├── package.json              ← Root scripts (concurrent start)
│
├── backend/
│   ├── server.js             ← Express server + all REST routes
│   ├── agentFunctions.js     ← Core AI functions (extract, rank, flashcard, test, eval, loop)
│   ├── aiClient.js           ← OpenAI client + tool definitions + mock fallback
│   ├── store.js              ← In-memory session store
│   ├── package.json
│   └── .env.example
│
└── frontend/
    ├── public/
    │   └── index.html
    └── src/
        ├── App.jsx                    ← Main orchestrator (step machine)
        ├── index.js
        ├── index.css                  ← Global design system
        ├── utils/
        │   └── api.js                 ← Axios API calls
        └── components/
            ├── UploadStep.jsx         ← PDF drag & drop upload
            ├── TopicsList.jsx         ← Ranked topics with progress
            ├── FlashcardsView.jsx     ← Flip card interface
            ├── TestView.jsx           ← MCQ test interface
            └── ResultsView.jsx        ← Score + agent recommendation
```

---

## 🔌 REST API Reference

All routes are on `http://localhost:3001`

### `POST /upload-pdf`
Upload a PDF file (multipart/form-data).
```json
// Response
{
  "sessionId": "uuid-here",
  "fileName": "ml-notes.pdf",
  "wordCount": 4821,
  "preview": "First 500 chars...",
  "message": "PDF uploaded and text extracted successfully"
}
```

### `POST /extract-topics`
```json
// Body
{ "sessionId": "uuid-here" }

// Response
{
  "topics": [
    {
      "name": "Neural Networks",
      "frequency": 9,
      "importance": 10,
      "difficulty": 8,
      "summary": "Computational models inspired by the human brain."
    }
  ],
  "count": 6
}
```

### `POST /rank-topics`
```json
// Response — topics now include priority
{
  "topics": [
    {
      "name": "Neural Networks",
      "priority": "High",
      "priorityScore": 9.2,
      ...
    }
  ]
}
```

### `POST /generate-flashcards`
```json
// Body
{ "sessionId": "...", "topicName": "Neural Networks" }

// Response
{
  "flashcards": [
    {
      "question": "What problem does backpropagation solve?",
      "answer": "It computes gradients efficiently via the chain rule...",
      "hint": "Think about how errors flow backwards."
    }
  ]
}
```

### `POST /generate-test`
```json
// Body
{ "sessionId": "...", "topicName": "Neural Networks" }

// Response (correct answers HIDDEN from client)
{
  "questions": [
    {
      "id": "q1",
      "question": "Which best describes a neural network?",
      "options": ["A", "B", "C", "D"],
      "difficulty": "easy"
    }
  ]
}
```

### `POST /evaluate-answers`
```json
// Body
{
  "sessionId": "...",
  "topicName": "Neural Networks",
  "userAnswers": { "q1": "option text", "q2": "option text" }
}

// Response
{
  "score": 60,
  "level": "medium",
  "feedback": "Good progress! Work on regularization.",
  "weakAreas": ["Regularization", "Optimization"],
  "questionResults": [
    { "questionId": "q1", "correct": true, "explanation": "..." }
  ]
}
```

### `POST /agent-loop`
```json
// Body
{ "sessionId": "...", "topicName": "Neural Networks", "performanceLevel": "medium" }

// Response
{
  "action": "take_test",          // show_flashcards | take_test | next_topic
  "message": "Let's reinforce with another test.",
  "recommendation": "One more test to solidify understanding.",
  "progressSummary": { "strong": 1, "medium": 2, "weak": 0, "pending": 3 }
}
```

---

## 🤖 Agent Loop Logic

```
PERCEIVE  → Read PDF / user answers / current progress
REASON    → Score < 50%? → weak | 50-79%? → medium | 80%+? → strong
PLAN      → weak: regenerate focused flashcards
           medium: generate new test on same topic
           strong: advance to next highest-priority topic
ACT       → Call appropriate function (generateFlashcards / generateTest)
OBSERVE   → Update session progress, return decision to frontend
```

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Axios, CSS custom properties
- **Backend**: Node.js, Express, Multer, pdf-parse
- **AI**: OpenAI GPT-4o-mini with function calling (tool use)
- **Storage**: In-memory (no database needed)

---

## 🧪 Testing Without OpenAI

The app ships with full mock data for all 4 AI tools:
- Realistic topics (Neural Networks, Gradient Descent, etc.)
- 5 flashcards per topic with hints
- 5 MCQ questions with difficulty levels
- Scored evaluation with weak area detection

Just run without setting `OPENAI_API_KEY` and everything works.

---

## 📝 Notes

- Sessions are stored in memory — they reset on server restart
- PDF text is truncated to 4000 chars for AI calls (configurable in `agentFunctions.js`)
- The frontend proxies API calls via CRA's `proxy` setting in `package.json`
