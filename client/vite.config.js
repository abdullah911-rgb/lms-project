import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  // Shim Node.js globals used internally by @zoom/meetingsdk
  // Without this, the SDK throws "Cannot read properties of undefined (reading 'includes')"
  // because it references `global` which is undefined in browser environments.
  define: {
    global: 'globalThis',
    'process.env': JSON.stringify({}),
  },

  // Prevent Vite from pre-bundling the Zoom SDK (it has internal CJS/ESM issues)
  optimizeDeps: {
    exclude: ['@zoom/meetingsdk'],
  },

  server: {
    allowedHosts: ['depraved-salary-cornhusk.ngrok-free.dev'],
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    },
  },
})

