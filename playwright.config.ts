import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  retries: 0,
  fullyParallel: true,
  // globalSetup: require.resolve('./global-setup'),
  use: {
    headless: true,
    viewport: { width: 1280, height: 1024 },
    ignoreHTTPSErrors: true,
  },
  reporter: [['html', { open: 'on-failure' }]],
});