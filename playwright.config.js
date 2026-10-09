import process from 'node:process';
import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir: './tests/browser',
 use: { baseURL: 'http://localhost:3000', launchOptions: process.env.PLAYWRIGHT_CHROME_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROME_PATH } : undefined },
 webServer: { command: 'npm run dev -- --host 127.0.0.1', url: 'http://localhost:3000', reuseExistingServer: !process.env.CI },
});
