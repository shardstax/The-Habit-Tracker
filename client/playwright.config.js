import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  fullyParallel: false,
  use: {
    baseURL: 'http://localhost:5173',
    headless: false,
    channel: 'chrome',
    trace: 'on-first-retry',
  },
  reporter: [['list']],
});
