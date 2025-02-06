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
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        ws: true
      }
    }
  },
  define: {
    __VITE_STRAVA_CLIENT_ID__: JSON.stringify(process.env.VITE_STRAVA_CLIENT_ID),
    __VITE_STRAVA_REDIRECT_URI__: JSON.stringify(process.env.VITE_STRAVA_REDIRECT_URI),
    __VITE_API_URL__: JSON.stringify(process.env.VITE_API_URL)
  }
}); 