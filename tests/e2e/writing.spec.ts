import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';
import { extractTextItems } from 'unpdf';

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

async function captureRenderedPdfFooter(
	page: import('@playwright/test').Page,
	pdfPath: string
): Promise<Buffer> {
	const pdfViewer = await page.context().newPage();
	try {
		await pdfViewer.setViewportSize({ width: 900, height: 1_100 });
		await pdfViewer.goto(pathToFileURL(pdfPath).href);
		await pdfViewer.waitForTimeout(1_500);
		return await pdfViewer.screenshot({
			clip: { x: 300, y: 760, width: 600, height: 190 }
		});
	} finally {
		await pdfViewer.close();
	}
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
	await expect(page.getByLabel('Page title')).toHaveValue('Mara Venn');
	await expect(page.locator('.writing-surface')).toContainText('Cartographer');
	await expect(page.getByText('2', { exact: true }).first()).toBeVisible();
});

test('keeps a long chapter on one continuous scrollable page and restores the writing position after reload', async ({
	page
}) => {
	await createNovel(page, 'The Long Road');
	const paragraphs = Array.from(
		{ length: 150 },
		(_, index) =>
			`Passage ${index + 1}. The road crossed the valley while the evening light changed over the hills, and the travellers kept moving toward the distant town.`
	);
	paragraphs.splice(75, 0, `A${'verylongword'.repeat(180)}`);

	const editor = page.locator('.writing-surface');
	await editor.fill(paragraphs.join('\n\n'));
	await expect(page.locator('.page-sheet')).toHaveCount(0);
	await expect(page.locator('.page-break-decoration')).toHaveCount(0);
	await expect(page.getByLabel('Manuscript pagination')).toHaveCount(0);
	await expect
		.poll(async () =>
			page.locator('.paper').evaluate((element) => element.getBoundingClientRect().height)
		)
		.toBeGreaterThan(4_000);

	await editor.focus();
	await page.keyboard.press('Control+End');
	await page.keyboard.type('\n\nThis sentence was added to the continuous writing surface.');
	await expect(editor).toContainText('added to the continuous writing surface');

	const layoutFits = await page.evaluate(() => {
		const workspace = document.querySelector<HTMLElement>('.workspace-page');
		const editorArea = document.querySelector<HTMLElement>('.editor-area');
		const writingSurface = document.querySelector<HTMLElement>('.writing-surface');
		const topbar = document.querySelector<HTMLElement>('.topbar');
		const editorToolbar = document.querySelector<HTMLElement>('.toolbar');
		if (!workspace || !editorArea || !writingSurface || !topbar || !editorToolbar) return false;

		const areaRect = editorArea.getBoundingClientRect();
		const surfaceRect = writingSurface.getBoundingClientRect();
		const toolbarRect = editorToolbar.getBoundingClientRect();
		return (
			document.documentElement.scrollWidth <= document.documentElement.clientWidth &&
			workspace.scrollWidth <= workspace.clientWidth &&
			workspace.scrollHeight <= workspace.clientHeight &&
			workspace.scrollTop === 0 &&
			editorArea.scrollWidth <= editorArea.clientWidth &&
			editorArea.scrollHeight > editorArea.clientHeight &&
			editorArea.clientHeight < window.innerHeight &&
			Math.abs(topbar.getBoundingClientRect().top) < 1 &&
			Math.abs(toolbarRect.top - areaRect.top) < 1 &&
			toolbarRect.bottom <= areaRect.bottom &&
			surfaceRect.left >= areaRect.left - 1 &&
			surfaceRect.right <= areaRect.right + 1
		);
	});
	expect(layoutFits).toBe(true);

	await page.setViewportSize({ width: 390, height: 844 });
	await expect(page.locator('.page-sheet')).toHaveCount(0);
	await expect(page.locator('.page-break-decoration')).toHaveCount(0);
	const mobileLayoutFits = await page.evaluate(() => {
		const workspace = document.querySelector<HTMLElement>('.workspace-page');
		const editorArea = document.querySelector<HTMLElement>('.editor-area');
		const topbar = document.querySelector<HTMLElement>('.topbar');
		const editorToolbar = document.querySelector<HTMLElement>('.toolbar');
		return Boolean(
			workspace &&
			workspace.scrollWidth <= workspace.clientWidth &&
			workspace.scrollHeight <= workspace.clientHeight &&
			workspace.scrollTop === 0 &&
			editorArea &&
			editorArea.scrollWidth <= editorArea.clientWidth &&
			editorArea.scrollHeight > editorArea.clientHeight &&
			topbar &&
			Math.abs(topbar.getBoundingClientRect().top) < 1 &&
			editorToolbar &&
			Math.abs(editorToolbar.getBoundingClientRect().top - editorArea.getBoundingClientRect().top) <
				1 &&
			document.documentElement.scrollWidth <= document.documentElement.clientWidth
		);
	});
	expect(mobileLayoutFits).toBe(true);
	const editorArea = page.locator('.editor-area');
	await editorArea.hover();
	await page.mouse.wheel(0, -1_000_000);
	await expect
		.poll(async () => editorArea.evaluate((element) => element.scrollTop))
		.toBeLessThan(2);
	const maximumScroll = await editorArea.evaluate(
		(element) => element.scrollHeight - element.clientHeight
	);
	await page.mouse.wheel(0, maximumScroll * 0.48);
	await expect
		.poll(async () => editorArea.evaluate((element) => element.scrollTop))
		.toBeGreaterThan(1_000);
	const scrollPosition = await editorArea.evaluate((element) => {
		const maximumScroll = element.scrollHeight - element.clientHeight;
		return {
			pixels: element.scrollTop,
			progress: element.scrollTop / maximumScroll
		};
	});
	expect(scrollPosition.pixels).toBeGreaterThan(1_000);

	await page.waitForTimeout(800);
	await page.reload();
	await expect(page.getByLabel('Page title')).toHaveValue('Chapter 1');
	await expect(editor).toContainText('Passage 150');
	await expect(editor).toContainText('added to the continuous writing surface');
	await expect(page.locator('.page-break-decoration')).toHaveCount(0);
	await expect
		.poll(async () =>
			editorArea.evaluate(
				(element) => element.scrollTop / (element.scrollHeight - element.clientHeight)
			)
		)
		.toBeGreaterThan(scrollPosition.progress - 0.002);
	await expect
		.poll(async () =>
			editorArea.evaluate(
				(element) => element.scrollTop / (element.scrollHeight - element.clientHeight)
			)
		)
		.toBeLessThan(scrollPosition.progress + 0.002);
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
	await page.getByLabel('Page title').fill('The Lantern Room');
	await page.getByLabel('Page title').press('Enter');
	await page.locator('.writing-surface').fill('A short chapter for export.');
	await page.waitForTimeout(700);

	const typesetHeading = page.getByLabel('Typeset page heading');
	await expect(typesetHeading).toContainText('Chapter 1');
	await expect(typesetHeading).toContainText('The Lantern Room');
	const editorTypesettingMatches = await page.evaluate(() => {
		const heading = document.querySelector<HTMLElement>('.typeset-document-heading');
		const title = heading?.querySelector<HTMLElement>('h1');
		const body = document.querySelector<HTMLElement>('.writing-surface p');
		const paper = document.querySelector<HTMLElement>('.paper');
		const writingSurface = document.querySelector<HTMLElement>('.writing-surface');
		if (!heading || !title || !body || !paper || !writingSurface) return false;

		const headingBounds = heading.getBoundingClientRect();
		const titleBounds = title.getBoundingClientRect();
		const bodyBounds = body.getBoundingClientRect();
		const pageBounds = paper.getBoundingClientRect();
		const headingStyle = getComputedStyle(heading);
		const bodyStyle = getComputedStyle(writingSurface);
		return (
			headingBounds.top > pageBounds.top &&
			headingBounds.bottom < bodyBounds.top &&
			bodyBounds.bottom < pageBounds.bottom &&
			Math.abs(
				titleBounds.left + titleBounds.width / 2 - (pageBounds.left + pageBounds.width / 2)
			) < 1 &&
			headingStyle.fontFamily === bodyStyle.fontFamily
		);
	});
	expect(editorTypesettingMatches).toBe(true);

	await page.getByText('Export', { exact: true }).click();
	const pdfDownload = page.waitForEvent('download');
	await page.getByRole('button', { name: /PDF/ }).click();
	const downloadedPdf = await pdfDownload;
	expect(downloadedPdf.suggestedFilename()).toBe('exportable-story.pdf');
	const pdfPath = await downloadedPdf.path();
	if (!pdfPath) throw new Error('The exported PDF was not available for verification.');
	const pdfBytes = new Uint8Array(await readFile(pdfPath));
	expect(new TextDecoder().decode(pdfBytes.slice(0, 5))).toBe('%PDF-');
	const extracted = await extractTextItems(pdfBytes);
	expect(extracted.totalPages).toBeGreaterThanOrEqual(1);
	const firstPageItems = extracted.items[0];
	const firstPageText = firstPageItems.map((item) => item.str).join(' ');
	expect(firstPageText.replaceAll(' ', '')).toContain('CHAPTER1');
	expect(firstPageText).toContain('The Lantern Room');
	expect(firstPageText).toContain('A short chapter for export.');
	expect(firstPageText).toContain('Page 1');
	const titleItem = firstPageItems.find((item) => item.str.includes('The Lantern Room'));
	const bodyItem = firstPageItems.find((item) => item.str.includes('A short chapter for export.'));
	if (!titleItem || !bodyItem)
		throw new Error('The PDF title or body text could not be positioned.');
	expect(titleItem.fontSize).toBeGreaterThan(bodyItem.fontSize);
	expect(titleItem.y).toBeGreaterThan(bodyItem.y);
	expect(Math.abs(titleItem.x + titleItem.width / 2 - 216)).toBeLessThan(6);
	expect(await captureRenderedPdfFooter(page, pdfPath)).toMatchSnapshot(
		'visible-default-page-number-footer.png',
		{ maxDiffPixelRatio: 0.02 }
	);

	await page.getByText('Export', { exact: true }).click();
	const epubDownload = page.waitForEvent('download');
	await page.getByRole('button', { name: /EPUB/ }).click();
	expect((await epubDownload).suggestedFilename()).toBe('exportable-story.epub');

	await page.getByRole('button', { name: 'Book settings' }).click();
	await page.getByLabel('Typography').selectOption('modern');
	await page.getByRole('button', { name: 'Save book settings' }).click();
	await expect(page.getByRole('dialog')).toHaveCount(0);
	await page.getByText('Export', { exact: true }).click();
	const modernPdfDownload = page.waitForEvent('download');
	await page.getByRole('button', { name: /PDF/ }).click();
	const modernPdfPath = await (await modernPdfDownload).path();
	if (!modernPdfPath) throw new Error('The Modern preset PDF was not available for verification.');
	expect(await captureRenderedPdfFooter(page, modernPdfPath)).toMatchSnapshot(
		'visible-modern-page-number-footer.png',
		{ maxDiffPixelRatio: 0.02 }
	);
});

test('configures a visible document range, sequence, numeral style, template, and position for PDF page numbers', async ({
	page
}) => {
	await createNovel(page, 'Numbered Story');
	await page.getByLabel('Page title').fill('The Opening');
	await page.getByLabel('Page title').press('Enter');
	await page.locator('.writing-surface').fill('The first numbered chapter.');
	await page.waitForTimeout(700);

	await page.getByLabel('Add a front page').click();
	await page.getByRole('button', { name: 'Title page', exact: true }).click();
	await expect(page.getByLabel('Page title')).toHaveValue('Title page');
	await page.locator('.writing-surface').fill('This front page is outside the numbered range.');
	await page.waitForTimeout(700);

	await page.getByRole('button', { name: /1 The Opening/ }).click();
	await page.getByRole('button', { name: 'Insert chapter after The Opening' }).click();
	await expect(page.getByLabel('Page title')).toHaveValue('Chapter 2');
	await page.getByLabel('Page title').fill('The Crossing');
	await page.getByLabel('Page title').press('Enter');
	await page.locator('.writing-surface').fill('The second numbered chapter.');
	await page.waitForTimeout(700);

	await page.getByLabel('Add a back page').click();
	await page.getByRole('button', { name: 'About the author', exact: true }).click();
	await expect(page.getByLabel('Page title')).toHaveValue('About the author');
	await page.locator('.writing-surface').fill('This back page is outside the numbered range.');
	await page.waitForTimeout(700);

	await page.getByRole('button', { name: 'Book settings' }).click();
	await page.getByLabel('Start numbering at').selectOption({ label: 'Chapter 1 — The Opening' });
	await page.getByLabel('Stop numbering after').selectOption({ label: 'Chapter 2 — The Crossing' });
	await page.getByLabel('Numbering sequence').selectOption('restart');
	await page.getByLabel('Restart page numbering at').fill('7');
	await page.getByLabel('Page number style').selectOption('roman');
	await page.getByLabel('Page number position').selectOption('bottom-center');
	await page.getByLabel('Page number text').fill('Folio {number}');
	await expect(page.getByLabel('Page number preview')).toContainText('Folio vii');
	await page.getByRole('button', { name: 'Save book settings' }).click();
	await expect(page.getByRole('dialog')).toHaveCount(0);

	await page.reload();
	await page.getByRole('button', { name: 'Book settings' }).click();
	await expect(page.getByLabel('Start numbering at')).toHaveValue(
		(await page
			.getByLabel('Start numbering at')
			.locator('option', { hasText: 'The Opening' })
			.getAttribute('value')) ?? ''
	);
	await expect(page.getByLabel('Restart page numbering at')).toHaveValue('7');
	await expect(page.getByLabel('Page number style')).toHaveValue('roman');
	await expect(page.getByLabel('Page number position')).toHaveValue('bottom-center');
	await expect(page.getByLabel('Page number text')).toHaveValue('Folio {number}');
	await page.getByRole('button', { name: 'Save book settings' }).click();
	await expect(page.getByRole('dialog')).toHaveCount(0);

	await page.getByText('Export', { exact: true }).click();
	const pdfDownload = page.waitForEvent('download');
	await page.getByRole('button', { name: /PDF/ }).click();
	const pdfPath = await (await pdfDownload).path();
	if (!pdfPath) throw new Error('The numbered PDF was not available for verification.');
	const extracted = await extractTextItems(new Uint8Array(await readFile(pdfPath)));
	expect(extracted.totalPages).toBe(4);
	const pageText = extracted.items.map((items) => items.map((item) => item.str).join(' '));
	expect(pageText[0]).not.toContain('Folio');
	expect(pageText[1]).toContain('Folio vii');
	expect(pageText[2]).toContain('Folio viii');
	expect(pageText[3]).not.toContain('Folio');
	const firstFolio = extracted.items[1].find((item) => item.str.includes('Folio vii'));
	if (!firstFolio) throw new Error('The visible page number could not be positioned.');
	expect(Math.abs(firstFolio.x + firstFolio.width / 2 - 216)).toBeLessThan(6);
	expect(firstFolio.y).toBeGreaterThan(20);
	expect(firstFolio.y).toBeLessThan(50);
});

test('uses book-wide chapter headings with persistent per-chapter overrides in the editor and PDF', async ({
	page
}) => {
	await createNovel(page, 'Heading Workshop');
	await page.getByLabel('Page title').fill('The Threshold');
	await page.getByLabel('Page title').press('Enter');

	await page.getByRole('button', { name: 'Book settings' }).click();
	await page.getByLabel('Chapter label text').fill('Scene {number}');
	await page.getByRole('checkbox', { name: /Chapter title/ }).uncheck();
	await expect(page.getByLabel('Chapter heading preview')).toContainText('Scene 1');
	await page.getByRole('button', { name: 'Save book settings' }).click();
	await expect(page.getByLabel('Typeset page heading')).toContainText('Scene 1');
	await expect(page.getByLabel('Typeset page heading')).not.toContainText('The Threshold');

	await page.getByRole('button', { name: 'Insert chapter after The Threshold' }).click();
	await page.getByRole('button', { name: 'Chapter heading' }).click();
	await page.getByRole('checkbox', { name: /Use book-wide heading style/ }).uncheck();
	await page.getByRole('checkbox', { name: /Automatic chapter label/ }).uncheck();
	await page.getByRole('button', { name: 'Save chapter heading' }).click();
	await expect(page.getByLabel('Typeset page heading')).toHaveCount(0);

	await page.reload();
	await expect(page.getByLabel('Page title')).toHaveValue('Chapter 2');
	await expect(page.getByLabel('Typeset page heading')).toHaveCount(0);
	await page.getByRole('button', { name: /1 The Threshold/ }).click();
	await expect(page.getByLabel('Typeset page heading')).toContainText('Scene 1');

	await page.getByText('Export', { exact: true }).click();
	const pdfDownload = page.waitForEvent('download');
	await page.getByRole('button', { name: /PDF/ }).click();
	const pdfPath = await (await pdfDownload).path();
	if (!pdfPath) throw new Error('The heading PDF was not available for verification.');
	const extracted = await extractTextItems(new Uint8Array(await readFile(pdfPath)));
	const pdfText = extracted.items
		.flat()
		.map((item) => item.str)
		.join(' ')
		.replaceAll(' ', '');
	expect(pdfText).toContain('SCENE1');
	expect(pdfText).not.toContain('CHAPTER1');
	expect(pdfText).not.toContain('CHAPTER2');
	expect(pdfText).not.toContain('TheThreshold');
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
	const handleCenter = {
		x: handleBox.x + handleBox.width / 2,
		y: handleBox.y + handleBox.height / 2
	};
	const hitResizeHandle = await page.evaluate(({ x, y }) => {
		const hit = document.elementFromPoint(x, y);
		return hit instanceof HTMLElement
			? hit.closest<HTMLElement>('[data-resize-handle]')?.dataset.resizeHandle
			: undefined;
	}, handleCenter);
	expect(hitResizeHandle).toBe('bottom-right');
	await page.mouse.move(handleCenter.x, handleCenter.y);
	await page.mouse.down();
	await expect(imageContainer).toHaveAttribute('data-resize-state', 'true');
	await page.mouse.move(handleBox.x + 80, handleBox.y + 45, { steps: 5 });
	await page.mouse.up();
	await expect
		.poll(async () => (await artwork.boundingBox())?.width ?? 0)
		.toBeGreaterThan(originalSize.width + 20);
	const resizedWidth = (await artwork.boundingBox())?.width ?? 0;
	await page.waitForTimeout(700);

	await page.reload();
	await expect(page.getByLabel('Page title')).toHaveValue('Chapter 1');
	const restoredArtwork = page.getByRole('img', { name: 'chapter-map.svg' });
	await expect(restoredArtwork).toBeVisible();
	await expect
		.poll(async () => (await restoredArtwork.boundingBox())?.width ?? 0)
		.toBeGreaterThan(resizedWidth - 2);
});
