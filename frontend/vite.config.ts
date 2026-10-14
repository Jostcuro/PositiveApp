import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy hacia el backend Laravel para que la SPA hable con la API en el
    // mismo origen (http://localhost:5173). Así funcionan las cookies de sesión
    // de Sanctum y la protección CSRF sin abrir CORS en desarrollo.
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
      '/sanctum': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
