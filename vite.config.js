import { defineConfig } from 'vite';

// base — корень домена bslamp.ru (GitHub Pages со своим доменом)
export default defineConfig({
  base: '/',
  build: { target: 'es2020', chunkSizeWarningLimit: 900 },
  // разработка: редактор ракурсов лежит в общей папке tools/ (симлинк scripts/editor.js)
  server: { fs: { allow: ['..'] } },
});
