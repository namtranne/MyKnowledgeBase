import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Base path. Defaults to the gh-pages project path used by the old Docusaurus
// deploy. Override with VITE_BASE=/ for root deployments or local-only use.
const base = process.env.VITE_BASE || '/MyKnowledgeBase/';

export default defineConfig({
  base,
  plugins: [
    // include .js so legacy components/pages with JSX are transformed by Babel.
    react({
      include: /\.(js|jsx)$/,
      // Ignore the legacy Docusaurus babel.config.js.
      babel: { babelrc: false, configFile: false },
    }),
  ],
  server: { host: '0.0.0.0', port: 5173 },
  preview: { host: '0.0.0.0', port: 4173 },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 4000,
  },
});
