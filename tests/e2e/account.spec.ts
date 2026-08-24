import { expect, test } from '@playwright/test';

test('migrates a local novel and restores it after premium login on a fresh device', async ({
	browser,
	page
}) => {
	test.skip(
		process.env.POCKETBASE_E2E !== 'true',
		'Set POCKETBASE_E2E=true when running against Docker Compose.'
	);
	await page.goto('/');
	await page.getByRole('button', { name: 'Create your first novel' }).click();
	await page.getByLabel('Novel title').fill('Migrated Lighthouse');
	await page.getByRole('button', { name: 'Create novel', exact: true }).click();
	await page.locator('.writing-surface').fill('This manuscript began as a free local novel.');
	await page.waitForTimeout(700);

	await page.getByRole('button', { name: 'Account and cloud storage' }).click();
	await page.getByRole('tab', { name: 'Create account' }).click();
	const email = `writer-${Date.now()}@example.test`;
	const password = 'a-long-test-password';
	await page.getByLabel('Your name').fill('Cloud Writer');
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Password').fill(password);
	await page.getByRole('button', { name: 'Create account', exact: true }).click();
	await expect(page.getByText(email)).toBeVisible();
	await page.getByRole('button', { name: 'Enable premium demo' }).click();
	await expect(page.getByText('Cloud saving is on')).toBeVisible();

	const cloudContext = await browser.newContext({
		baseURL: new URL(page.url()).origin,
		serviceWorkers: 'allow'
	});
	try {
		const cloudPage = await cloudContext.newPage();
		await cloudPage.goto('/');
		await expect(cloudPage.getByText('0 projects')).toBeVisible();
		await cloudPage.getByRole('button', { name: 'Premium' }).click();
		await cloudPage.getByLabel('Email').fill(email);
		await cloudPage.getByLabel('Password').fill(password);
		await cloudPage.getByRole('button', { name: 'Sign in', exact: true }).click();
		await expect(cloudPage.getByRole('button', { name: /Migrated Lighthouse/ })).toBeVisible();
		await cloudPage.getByRole('button', { name: /Migrated Lighthouse/ }).click();
		await expect(cloudPage.locator('.writing-surface')).toContainText(
			'This manuscript began as a free local novel.'
		);
	} finally {
		await cloudContext.close();
	}
});
