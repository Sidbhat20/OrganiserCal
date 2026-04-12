import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(() => {
  const isVercel = Boolean(process.env.VERCEL)
  const base = process.env.VITE_BASE_PATH || (isVercel ? '/' : '/OrganiserCal/')

  return {
    plugins: [react()],
    base,
  }
})
