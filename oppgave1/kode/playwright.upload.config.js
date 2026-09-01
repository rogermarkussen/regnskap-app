import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('../../', import.meta.url));
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['commonRawFolder.spec.js', 'budgetFinancing.spec.js'],
  outputDir: './test-results/upload',
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 20_000 },
  use: { ...devices['Desktop Chrome'], screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: [
    { command: 'npm exec -- vite --config vite.public.config.js --host 127.0.0.1 --port 3111 --strictPort', cwd: `${repo}oppgave1/kode`, url: 'http://127.0.0.1:3111', timeout: 120_000 },
    { command: 'npm exec -- vite --host 127.0.0.1 --port 3112 --strictPort', cwd: `${repo}oppgave2/kode`, url: 'http://127.0.0.1:3112', timeout: 120_000 },
    { command: 'npm exec -- vite --host 127.0.0.1 --port 3113 --strictPort', cwd: `${repo}oppgave3`, url: 'http://127.0.0.1:3113', timeout: 120_000 }
  ],
});
