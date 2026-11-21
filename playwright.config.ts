import { defineConfig, devices } from '@playwright/test';

// El navegador preinstalado se usa si existe (entorno de construcción); en CI, el de Playwright.
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'off',
    launchOptions: executablePath ? { executablePath } : {},
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], launchOptions: executablePath ? { executablePath } : {} } }],
  webServer: [
    {
      command: 'pnpm start -p 3100',
      url: 'http://localhost:3100/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { MOCK_DATA: '1', CRON_SECRET: 'secreto-de-prueba', HEALTH_TOKEN: 'token-de-prueba' },
    },
    {
      // Segundo servidor con la caída de Yahoo simulada (test E2E 3).
      command: 'pnpm start -p 3101',
      url: 'http://localhost:3101/api/snapshot',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { MOCK_DATA: '1', MOCK_FAIL: 'yahoo', CRON_SECRET: 'secreto-de-prueba' },
    },
  ],
});
