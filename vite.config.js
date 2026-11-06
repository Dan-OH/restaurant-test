import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Scan all source files at startup, including lazily loaded admin code (editors, dashboard),
    // so every dependency is pre-bundled up front. Otherwise Vite discovers them mid-session,
    // re-bundles, and pages that are already open fail to load admin code until reloaded.
    entries: ['index.html', 'src/**/*.{js,jsx}'],
  },
})
