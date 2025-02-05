import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  server: {
    port: 3000, // Frontend port
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:5173', // Backend port
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path
      }
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    'process.env.VITE_STRAVA_CLIENT_ID': JSON.stringify(process.env.VITE_STRAVA_CLIENT_ID),
    'process.env.VITE_STRAVA_REDIRECT_URI': JSON.stringify(process.env.VITE_STRAVA_REDIRECT_URI)
  }
}); 