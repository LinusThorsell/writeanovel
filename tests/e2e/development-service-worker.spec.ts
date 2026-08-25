import { expect, test } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

let developmentServer: ViteDevServer;
let developmentBaseUrl: string;

test.beforeAll(async () => {
	developmentServer = await createServer({
		logLevel: 'error',
		server: {
			host: '127.0.0.1',
			port: 0,
			strictPort: false
		}
	});
	await developmentServer.listen();

	const address = developmentServer.httpServer?.address();
	if (!address || typeof address === 'string') {
		throw new Error('The development E2E server did not expose a TCP port.');
	}

	developmentBaseUrl = `http://127.0.0.1:${address.port}`;
});

test.afterAll(async () => {
	await developmentServer.close();
});

test('development serves a no-store cleanup worker and leaves no offline cache behind', async ({
	page
}) => {
	const workerResponse = await page.request.get(`${developmentBaseUrl}/service-worker.js`);
	expect(workerResponse.ok()).toBe(true);
	expect(workerResponse.headers()['cache-control']).toContain('no-store');
	expect(await workerResponse.text()).not.toMatch(/^\s*import\s/m);

	await page.goto(`${developmentBaseUrl}/app`, { waitUntil: 'networkidle' });
	await expect(page).toHaveTitle('Writing Studio | WriteANovel');

	await expect
		.poll(() =>
			page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)
		)
		.toBe(0);
	expect(
		await page.evaluate(async () =>
			(await caches.keys()).filter((key) => key.startsWith('writeanovel-'))
		)
	).toEqual([]);

	await page.reload({ waitUntil: 'networkidle' });
	await expect(page).toHaveTitle('Writing Studio | WriteANovel');
});

test('development recovers automatically from a stale classic service worker cache', async ({
	page
}) => {
	let mainFrameNavigations = 0;
	page.on('framenavigated', (frame) => {
		if (frame === page.mainFrame()) mainFrameNavigations += 1;
	});

	await page.goto(`${developmentBaseUrl}/app`, { waitUntil: 'networkidle' });
	await expect
		.poll(() =>
			page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)
		)
		.toBe(0);

	const navigationsBeforeRegistration = mainFrameNavigations;
	await page.evaluate(async () => {
		const staleCache = await caches.open('writeanovel-stale-classic-e2e');
		await staleCache.put(
			'/app',
			new Response('<title>Stale development shell</title><p>stale-development-shell</p>', {
				headers: { 'Content-Type': 'text/html' }
			})
		);

		await navigator.serviceWorker.register('/service-worker.js?classic-bootstrap=1', {
			scope: '/',
			updateViaCache: 'none'
		});
	});

	await expect.poll(() => mainFrameNavigations - navigationsBeforeRegistration).toBe(1);
	await expect
		.poll(() =>
			page.evaluate(async () => ({
				registrations: (await navigator.serviceWorker.getRegistrations()).length,
				applicationCaches: (await caches.keys()).filter((key) => key.startsWith('writeanovel-'))
			}))
		)
		.toEqual({ registrations: 0, applicationCaches: [] });

	await expect(page).toHaveTitle('Writing Studio | WriteANovel');
	await expect(page.getByText('stale-development-shell')).toHaveCount(0);

	await page.reload({ waitUntil: 'networkidle' });
	await expect(page).toHaveTitle('Writing Studio | WriteANovel');
});
