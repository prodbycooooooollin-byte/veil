// Renderer only, in a plain browser. The Electron bridge is replaced by a mock (see src/renderer/src/lib/api.ts).
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: 'src/renderer',
  plugins: [react()],
  server: { port: 5188, strictPort: true },
})
