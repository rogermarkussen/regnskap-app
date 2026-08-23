import { defineConfig, devices } from '@playwright/test';

const deployedBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = deployedBaseUrl ?? 'http://127.0.0.1:3003';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 15_000
  },
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: deployedBaseUrl
    ? undefined
    : {
        command: 'npm run dev:fast',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000
      }
});
