import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 3001,
    host: true,
    allowedHosts: true
  },
  build: {
    target: 'esnext',
    assetsInlineLimit: 0
  }
});
