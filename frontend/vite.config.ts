import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  preview: {
    allowedHosts: ['j557a9pdjl.preview.c40.airoapp.ai'],
    host: true,
  },
  server: {
    port: 5173,
    host: true,
  },
});
