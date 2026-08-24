import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const systemChromium = '/run/current-system/sw/bin/chromium';

export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: false,
	retries: process.env.CI ? 2 : 0,
	reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
	use: {
		...devices['Desktop Chrome'],
		baseURL: externalBaseUrl ?? 'http://127.0.0.1:4173',
		serviceWorkers: 'allow',
		trace: 'on-first-retry',
		launchOptions: existsSync(systemChromium) ? { executablePath: systemChromium } : undefined
	},
	webServer: externalBaseUrl
		? undefined
		: {
				command: 'npm run build && npm run preview -- --port 4173',
				url: 'http://127.0.0.1:4173',
				reuseExistingServer: !process.env.CI,
				timeout: 120_000
			}
});
