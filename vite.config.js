import { defineConfig } from 'vite';

export default defineConfig({
  // Game runs at root
  root: '.',
  base: './',

  // Assetsde beatmaps .osu são tratados como texto
  assetsInclude: ['**/*.osu'],

  server: {
    port: 5173,
    open: true,
    // Necessário para Web Audio API funcionar localmente
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },

  build: {
    outDir: 'dist',
    target: 'es2022',
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
  },

  // Vitest config embutida
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['tests/**/*.test.js'],
  },
});
