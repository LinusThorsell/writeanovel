import { expect, test } from '@playwright/test';

test('checks for a fresh service worker without using the browser cache', async ({ page }) => {
	await page.goto('/app');
	await page.evaluate(() => navigator.serviceWorker.ready);

	await page.addInitScript(() => {
		const originalUpdate = ServiceWorkerRegistration.prototype.update;
		ServiceWorkerRegistration.prototype.update = function () {
			const count = Number(sessionStorage.getItem('writeanovel-sw-update-count') ?? '0');
			sessionStorage.setItem('writeanovel-sw-update-count', String(count + 1));
			return originalUpdate.call(this);
		};
	});

	await page.reload();

	await expect
		.poll(() =>
			page.evaluate(() => Number(sessionStorage.getItem('writeanovel-sw-update-count') ?? '0'))
		)
		.toBeGreaterThan(0);
	expect(
		await page.evaluate(async () => (await navigator.serviceWorker.ready).updateViaCache)
	).toBe('none');
});

test('normal reload bypasses a stale cached app shell', async ({ page }) => {
	await page.goto('/app');
	await page.evaluate(() => navigator.serviceWorker.ready);
	await page.reload();
	await expect
		.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.state))
		.toBe('activated');

	await page.evaluate(async () => {
		const cacheName = (await caches.keys()).find((key) => key.startsWith('writeanovel-'));
		if (!cacheName) throw new Error('WriteANovel application cache was not created.');

		const cache = await caches.open(cacheName);
		await cache.put(
			'/app',
			new Response('<title>Stale cached application</title><p>stale-app-shell</p>', {
				headers: { 'Content-Type': 'text/html' }
			})
		);
	});

	await page.reload();

	await expect(page).toHaveTitle('Writing Studio | WriteANovel');
	await expect(page.getByText('stale-app-shell')).toHaveCount(0);
	await expect(page.locator('.library-page')).toBeVisible();
});

test('fits the mobile viewport and offers application installation', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 700 });
	await page.goto('/app');
	await expect(page.locator('.library-page')).toBeVisible();

	await page.evaluate(() => {
		const installEvent = new Event('beforeinstallprompt') as BeforeInstallPromptEvent;
		Object.defineProperties(installEvent, {
			platforms: { value: ['web'] },
			prompt: { value: async () => undefined },
			userChoice: {
				value: Promise.resolve({ outcome: 'accepted', platform: 'web' })
			}
		});
		window.dispatchEvent(installEvent);
	});

	const installButton = page.getByRole('button', { name: 'Install application' });
	await expect(installButton).toBeVisible();
	await installButton.click();
	await expect(installButton).toBeHidden();

	await page.getByRole('button', { name: 'Create your first novel' }).click();
	await page.getByLabel('Novel title').fill('Mobile Viewport');
	await page.getByRole('button', { name: 'Create novel', exact: true }).click();

	const viewportDifference = await page
		.locator('.workspace-page')
		.evaluate((element) => Math.abs(element.getBoundingClientRect().height - window.innerHeight));
	expect(viewportDifference).toBeLessThanOrEqual(1);
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
		true
	);
});

test('installed app reloads and keeps writing with the network disabled', async ({
	context,
	page
}) => {
	await page.goto('/app');
	await page.evaluate(
		() =>
			new Promise<void>((resolve) => {
				const request = indexedDB.deleteDatabase('writeanovel');
				request.onsuccess = () => resolve();
				request.onerror = () => resolve();
				request.onblocked = () => resolve();
			})
	);
	await page.reload();
	await page.getByRole('button', { name: /create your first novel|new novel/i }).click();
	await page.getByLabel('Novel title').fill('Offline Mountain');
	await page.getByRole('button', { name: 'Create novel', exact: true }).click();
	await page.locator('.writing-surface').fill('Written before the connection disappeared.');
	await page.waitForTimeout(700);

	await page.evaluate(async () => {
		await navigator.serviceWorker.ready;
	});
	await page.reload();
	await expect
		.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.state))
		.toBe('activated');
	await context.setOffline(true);
	await page.reload();
	await expect(page.getByText('Offline Mountain')).toBeVisible();
	await expect(page.getByLabel('Page title')).toHaveValue('Chapter 1');
	await expect(page.locator('.writing-surface')).toContainText('connection disappeared');
	await page.locator('.writing-surface').fill('Written completely offline.');
	await page.waitForTimeout(700);
	await context.setOffline(false);
});
