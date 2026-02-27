import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      'erp-admin-223240539839.us-east1.run.app',
      'admin.does-god-exist.org'
    ]
  }
})
