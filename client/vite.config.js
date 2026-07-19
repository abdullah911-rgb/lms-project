import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  // Shim Node.js globals used internally by @zoom/meetingsdk.
  // The SDK accesses `global`, `process.env.NODE_ENV`, etc.
  // Without these, it throws "Cannot read properties of undefined (reading 'includes')"
  // NOTE: values here are raw JS code expressions, NOT JSON strings.
  define: {
    'global': 'globalThis',
    'process.env.NODE_ENV': '"production"',  // string literal "production"
    'process.env': '({})',                   // empty object literal
    'process.browser': 'true',
    'process.version': '"v18.0.0"',
  },

  // Include the Zoom SDK in pre-bundling so rolldown applies global shims to it
  optimizeDeps: {
    include: ['@zoom/meetingsdk/embedded'],
    rolldownOptions: {
      define: {
        global: 'globalThis',
      },
    },
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


