import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// BASE_PATH lets the same build serve from a sub-path: the GitHub Pages workflow
// sets it to /Reallife-AI/. Vercel and local dev leave it unset (domain root).
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
})
