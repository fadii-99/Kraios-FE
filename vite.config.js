import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://5c79-182-182-225-12.ngrok-free.app',
        changeOrigin: true,
        secure: false,
        headers: {
          'ngrok-skip-browser-warning': 'true',
        },
      },
      // Job progress channel. REST polling is the contract and works without
      // this; the socket is the optional faster path in local development,
      // where the app and the backend share an origin through this proxy.
      '/ws': {
        target: 'wss://5c79-182-182-225-12.ngrok-free.app',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
})
