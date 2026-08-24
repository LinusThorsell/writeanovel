import { expect, test } from '@playwright/test';

async function clearLocalLibrary(page: import('@playwright/test').Page): Promise<void> {
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
}

async function createNovel(
	page: import('@playwright/test').Page,
	title = 'The Glass Harbor'
): Promise<void> {
	await page.getByRole('button', { name: /create your first novel|new novel/i }).click();
	await page.getByLabel('Novel title').fill(title);
	await page.getByLabel('Author name').fill('Lin Writer');
	await page.getByRole('button', { name: 'Create novel', exact: true }).click();
	await expect(page.getByLabel('Page title')).toHaveValue('Chapter 1');
}

test.beforeEach(async ({ page }) => {
	await clearLocalLibrary(page);
	await expect(page).toHaveTitle('Writing Studio | WriteANovel');
	await expect(page.getByRole('link', { name: 'WriteANovel home' })).toContainText('WriteANovel');
});

test('creates, orders, writes, and persists a multi-file novel locally', async ({ page }) => {
	await createNovel(page);
	await page.getByRole('button', { name: 'Insert chapter after Chapter 1' }).click();
	await expect(page.getByLabel('Page title')).toHaveValue('Chapter 2');
	await page.locator('.writing-surface').fill('The harbor bells sounded before dawn.');
	await page.waitForTimeout(700);

	await page.getByRole('button', { name: 'Add characters' }).click();
	await expect(page.getByLabel('Page title')).toHaveValue('New character');
	await page.getByLabel('Page title').fill('Mara Venn');
	await page.getByLabel('Page title').press('Enter');
	await page
		.locator('.writing-surface')
		.fill('Cartographer, reluctant heir, and keeper of a dangerous map.');
	await page.waitForTimeout(700);

	await page.reload();
	await page.getByRole('button', { name: /The Glass Harbor/ }).click();
	await page.getByRole('button', { name: /Mara Venn/ }).click();
	await expect(page.locator('.writing-surface')).toContainText('Cartographer');
	await expect(page.getByText('2', { exact: true }).first()).toBeVisible();
});

test('anonymous free writing makes no PocketBase requests', async ({ page }) => {
	const backendRequests: string[] = [];
	page.on('request', (request) => {
		if (request.url().includes(':8090')) backendRequests.push(request.url());
	});
	await createNovel(page, 'Entirely Local');
	await page.locator('.writing-surface').fill('No server required.');
	await page.waitForTimeout(700);
	await expect.poll(() => backendRequests).toEqual([]);
});

test('exports direct PDF and EPUB downloads', async ({ page }) => {
	await createNovel(page, 'Exportable Story');
	await page.locator('.writing-surface').fill('A short chapter for export.');
	await page.waitForTimeout(700);

	await page.getByText('Export', { exact: true }).click();
	const pdfDownload = page.waitForEvent('download');
	await page.getByRole('button', { name: /PDF/ }).click();
	expect((await pdfDownload).suggestedFilename()).toBe('exportable-story.pdf');

	await page.getByText('Export', { exact: true }).click();
	const epubDownload = page.waitForEvent('download');
	await page.getByRole('button', { name: /EPUB/ }).click();
	expect((await epubDownload).suggestedFilename()).toBe('exportable-story.epub');
});

test('configures book pages, raster and SVG covers, and positioned resizable artwork', async ({
	page
}) => {
	await createNovel(page, 'Illustrated Draft');

	await page.getByLabel('Add a front page').click();
	await page.getByRole('button', { name: 'Title page', exact: true }).click();
	await expect(page.getByLabel('Page title')).toHaveValue('Title page');
	await page.getByLabel('Add a back page').click();
	await page.getByRole('button', { name: 'About the author', exact: true }).click();
	await expect(page.getByLabel('Page title')).toHaveValue('About the author');

	await page.getByRole('button', { name: 'Book settings' }).click();
	await page.getByLabel('Subtitle').fill('A cartographer’s tale');
	await page.getByLabel('Trim size').selectOption('a5');
	await page.getByLabel('Typography').selectOption('modern');
	const frontCover = page.locator('.cover-card').filter({ hasText: 'Front cover' });
	await frontCover.locator('input[type=file]').setInputFiles({
		name: 'front-cover.png',
		mimeType: 'image/png',
		buffer: Buffer.from(
			'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nWQAAAAASUVORK5CYII=',
			'base64'
		)
	});
	await expect(frontCover.getByRole('img', { name: 'front cover' })).toBeVisible();
	const coverSvg =
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600"><rect width="400" height="600" fill="#284d3f"/><text x="200" y="300" fill="white" text-anchor="middle">Back</text></svg>';
	const backCover = page.locator('.cover-card').filter({ hasText: 'Back cover' });
	await backCover.locator('input[type=file]').setInputFiles({
		name: 'back-cover.svg',
		mimeType: 'image/svg+xml',
		buffer: Buffer.from(coverSvg)
	});
	await expect(backCover.getByRole('img', { name: 'back cover' })).toBeVisible();
	await page.getByRole('button', { name: 'Save book settings' }).click();

	await page.getByRole('button', { name: /1 Chapter 1/ }).click();
	const chapterSvg =
		'<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"><rect width="320" height="180" rx="12" fill="#e7b892"/><path d="M20 140L120 45l60 65 45-35 75 65z" fill="#284d3f"/></svg>';
	await page.locator('.toolbar input[type=file]').setInputFiles({
		name: 'chapter-map.svg',
		mimeType: 'image/svg+xml',
		buffer: Buffer.from(chapterSvg)
	});
	const artwork = page.getByRole('img', { name: 'chapter-map.svg' });
	await expect(artwork).toBeVisible();
	await artwork.click();
	await expect(page.getByLabel('Image position')).toBeVisible();
	await page.getByRole('button', { name: 'Align image right' }).click();
	const imageContainer = artwork.locator('xpath=ancestor::*[@data-resize-container]');
	await expect
		.poll(() => imageContainer.evaluate((element) => getComputedStyle(element).justifyContent))
		.toBe('flex-end');

	const originalSize = await artwork.boundingBox();
	const resizeHandle = page.locator('[data-resize-handle="bottom-right"]');
	const handleBox = await resizeHandle.boundingBox();
	if (!originalSize || !handleBox) throw new Error('The image resize controls are not visible.');
	await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
	await page.mouse.down();
	await page.mouse.move(handleBox.x + 80, handleBox.y + 45, { steps: 5 });
	await page.mouse.up();
	await expect
		.poll(async () => (await artwork.boundingBox())?.width ?? 0)
		.toBeGreaterThan(originalSize.width + 20);
	const resizedWidth = (await artwork.boundingBox())?.width ?? 0;
	await page.waitForTimeout(700);

	await page.reload();
	await page.getByRole('button', { name: /Illustrated Draft/ }).click();
	const restoredArtwork = page.getByRole('img', { name: 'chapter-map.svg' });
	await expect(restoredArtwork).toBeVisible();
	await expect
		.poll(async () => (await restoredArtwork.boundingBox())?.width ?? 0)
		.toBeGreaterThan(resizedWidth - 2);
});
