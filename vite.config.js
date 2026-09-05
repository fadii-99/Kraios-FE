import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // The same upstream the Vercel proxy talks to, so development and the
  // deployed app share one origin story. Override with BACKEND_ORIGIN in
  // `.env.local` when pointing at a local runserver or a tunnel.
  const backendOrigin = (env.BACKEND_ORIGIN || 'http://18.141.164.144:8000').replace(/\/+$/, '')
  const backendWsOrigin = backendOrigin.replace(/^http/, 'ws')

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: backendOrigin,
          changeOrigin: true,
          secure: false,
        },
        // Job progress channel. REST polling is the contract and works without
        // this; the socket is the optional faster path in local development,
        // where the app and the backend share an origin through this proxy.
        '/ws': {
          target: backendWsOrigin,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
    },
  }
})
