import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { jsonRoutes } from './server/vite-json.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [jsonRoutes(), react()],
})
