import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/upload-pdf': 'http://localhost:3001',
      '/extract-topics': 'http://localhost:3001',
      '/rank-topics': 'http://localhost:3001',
      '/generate-flashcards': 'http://localhost:3001',
      '/generate-test': 'http://localhost:3001',
      '/evaluate-answers': 'http://localhost:3001',
      '/agent-loop': 'http://localhost:3001',
      '/session': 'http://localhost:3001',
    }
  }
})
