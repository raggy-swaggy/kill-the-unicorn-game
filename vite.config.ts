import { defineConfig } from 'vite';

export default defineConfig({
  // Relative paths so the same build works on GitHub Pages, Netlify and itch.io.
  base: './',
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    // Phaser alone is ~1.3 MB; one chunk is fine for a small game.
    chunkSizeWarningLimit: 1600,
  },
});
