import { expect, test } from '@playwright/test';

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
