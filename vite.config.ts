import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 等サブパスでも動くよう相対パスで出力
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
  },
});
