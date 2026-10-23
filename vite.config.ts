import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages serves the app from /<repo>/, set by the Pages workflow
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
})
