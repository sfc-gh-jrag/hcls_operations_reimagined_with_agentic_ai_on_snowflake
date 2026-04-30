import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// For local dev: set VITE_PLATFORM_ENDPOINT in .env
// e.g. VITE_PLATFORM_ENDPOINT=xxxx-your-account.snowflakecomputing.app
const platformEndpoint = process.env.VITE_PLATFORM_ENDPOINT || 'REPLACE_WITH_PLATFORM_ENDPOINT'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/agents': {
        target: `https://${platformEndpoint}`,
        changeOrigin: true,
        secure: false,
        rewrite: (path: string) => path.replace(/^\/api\/agents/, '/agents'),
      },
      '/api': {
        target: `https://${platformEndpoint}`,
        changeOrigin: true,
        secure: false,
      },
      '/data': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
