import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  base: process.env.PUBLIC_BASE || './',
  publicDir: false,
  plugins: [svelte()],
  build: {
    outDir: 'build',
    emptyOutDir: true,
    sourcemap: false
  }
});
