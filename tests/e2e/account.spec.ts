import { expect, test } from '@playwright/test';
import PocketBase from 'pocketbase';

test('rejects self-service premium, then migrates after administrator assignment', async ({
	browser,
	page
}) => {
	const adminEmail = process.env.PB_ADMIN_EMAIL;
	const adminPassword = process.env.PB_ADMIN_PASSWORD;
	test.skip(
		process.env.POCKETBASE_E2E !== 'true' || !adminEmail || !adminPassword,
		'Set POCKETBASE_E2E=true and provide PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD.'
	);
	if (!adminEmail || !adminPassword) throw new Error('PocketBase test credentials are required.');

	const admin = new PocketBase(process.env.POCKETBASE_URL ?? 'http://127.0.0.1:8090');
	await admin.collection('_superusers').authWithPassword(adminEmail, adminPassword);
	const blockedRegistration = new PocketBase(process.env.POCKETBASE_URL ?? 'http://127.0.0.1:8090');
	await expect(
		blockedRegistration.collection('users').create({
			email: `self-premium-${Date.now()}@example.test`,
			password: 'a-long-test-password',
			passwordConfirm: 'a-long-test-password',
			display_name: 'Self Premium',
			is_premium: true
		})
	).rejects.toMatchObject({ status: 400 });
	let createdUserId: string | undefined;
	try {
		await page.goto('/app');
		await page.getByRole('button', { name: 'Create your first novel' }).click();
		await page.getByLabel('Novel title').fill('Migrated Lighthouse');
		await page.getByRole('button', { name: 'Create novel', exact: true }).click();
		await page.locator('.writing-surface').fill('This manuscript began as a free local novel.');
		await page.waitForTimeout(700);
		await page.getByRole('button', { name: 'Book settings' }).click();
		await page.getByLabel('Chapter label text').fill('Part {number}');
		await page.getByRole('checkbox', { name: /Chapter title/ }).uncheck();
		await page.getByLabel('Numbering sequence').selectOption('restart');
		await page.getByLabel('Restart page numbering at').fill('3');
		await page.getByLabel('Page number style').selectOption('roman');
		await page.getByLabel('Page number position').selectOption('bottom-center');
		await page.getByLabel('Page number text').fill('Cloud {number}');
		await page.getByRole('button', { name: 'Save book settings' }).click();
		await page.getByRole('button', { name: 'Chapter heading' }).click();
		await page.getByRole('checkbox', { name: /Use book-wide heading style/ }).uncheck();
		await page.getByLabel('Chapter label text').fill('Act {number}');
		await page.getByRole('button', { name: 'Save chapter heading' }).click();
		await expect(page.getByLabel('Typeset page heading')).toContainText('Act 1');

		await page.getByRole('button', { name: 'Account and cloud storage' }).click();
		await page.getByRole('tab', { name: 'Create account' }).click();
		const email = `writer-${Date.now()}@example.test`;
		const password = 'a-long-test-password';
		await page.getByLabel('Your name').fill('Cloud Writer');
		await page.getByLabel('Email').fill(email);
		await page.getByLabel('Password').fill(password);
		await page.getByRole('button', { name: 'Create account', exact: true }).click();
		await expect(page.getByText(email)).toBeVisible();
		await expect(page.getByText('Premium access is invite-only during this demo.')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Enable premium demo' })).toHaveCount(0);

		const userClient = new PocketBase(process.env.POCKETBASE_URL ?? 'http://127.0.0.1:8090');
		const userAuth = await userClient.collection('users').authWithPassword(email, password);
		createdUserId = userAuth.record.id;
		await expect(
			userClient.collection('users').update(createdUserId, { is_premium: true })
		).rejects.toMatchObject({ status: 404 });

		await admin.collection('users').update(createdUserId, { is_premium: true });
		await page.reload();
		await page.getByRole('button', { name: 'Account and cloud storage' }).click();
		await expect(page.getByText('Cloud saving is on')).toBeVisible();
		await page.getByRole('button', { name: 'Move local novels to cloud' }).click();
		await expect(page.getByText('Your local novels are now available in the cloud.')).toBeVisible();

		const cloudContext = await browser.newContext({
			baseURL: new URL(page.url()).origin,
			serviceWorkers: 'allow'
		});
		try {
			const cloudPage = await cloudContext.newPage();
			await cloudPage.goto('/app');
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
			await expect(cloudPage.getByLabel('Typeset page heading')).toContainText('Act 1');
			await cloudPage.getByRole('button', { name: 'Book settings' }).click();
			await expect(cloudPage.getByLabel('Restart page numbering at')).toHaveValue('3');
			await expect(cloudPage.getByLabel('Page number style')).toHaveValue('roman');
			await expect(cloudPage.getByLabel('Page number position')).toHaveValue('bottom-center');
			await expect(cloudPage.getByLabel('Page number text')).toHaveValue('Cloud {number}');
			await cloudPage.getByRole('button', { name: 'Save book settings' }).click();
			await cloudPage.getByRole('button', { name: 'Chapter heading' }).click();
			await expect(
				cloudPage.getByRole('checkbox', { name: /Use book-wide heading style/ })
			).not.toBeChecked();
			await cloudPage.getByRole('checkbox', { name: /Use book-wide heading style/ }).check();
			await expect(cloudPage.getByLabel('Chapter heading preview')).toContainText('Part 1');
		} finally {
			await cloudContext.close();
		}
	} finally {
		if (createdUserId) {
			await admin
				.collection('users')
				.delete(createdUserId)
				.catch(() => undefined);
		}
	}
});
