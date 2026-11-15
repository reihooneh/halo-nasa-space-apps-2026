import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

const single = process.env.SINGLE === '1'

export default defineConfig({
  base: './',
  plugins: [react(), ...(single ? [viteSingleFile()] : [])],
  build: { chunkSizeWarningLimit: 4000, assetsInlineLimit: single ? 100000000 : 4096 },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
} as any)
