import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  base: process.env.PUBLIC_BASE || './',
  define: {
    __PUBLIC_BUILD__: JSON.stringify(process.env.PUBLIC_BUILD === 'true')
  },
  plugins: [svelte()],
  publicDir: process.env.PUBLIC_BUILD === 'true' ? false : 'static',
  build: {
    outDir: 'build',
    emptyOutDir: true,
    sourcemap: false
  }
});
