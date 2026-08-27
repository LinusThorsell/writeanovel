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

test('inserts, draws, reopens, edits, and persists an editable drawing block', async ({ page }) => {
	await createNovel(page, 'The Drawn Harbor');
	await page.getByRole('button', { name: 'Add places' }).click();
	await expect(page.getByLabel('Page title')).toHaveValue('New place');
	await page.getByLabel('Page title').fill('Glass Harbor');
	await page.getByLabel('Page title').press('Enter');

	await page.getByRole('button', { name: 'Insert drawing' }).click();
	const dialog = page.getByRole('dialog', { name: 'Edit drawing' });
	const canvas = page.getByRole('application', { name: 'Drawing canvas' });
	await expect(dialog).toBeVisible();
	await expect(canvas).toBeVisible();

	const bounds = await canvas.boundingBox();
	if (!bounds) throw new Error('The drawing canvas was not measurable.');
	await page.mouse.move(bounds.x + bounds.width * 0.2, bounds.y + bounds.height * 0.25);
	await page.mouse.down();
	await page.mouse.move(bounds.x + bounds.width * 0.45, bounds.y + bounds.height * 0.4, {
		steps: 8
	});
	await page.mouse.move(bounds.x + bounds.width * 0.7, bounds.y + bounds.height * 0.28, {
		steps: 8
	});
	await page.mouse.up();
	await expect(canvas.locator(':scope > g > path')).toHaveCount(1);
	await page.keyboard.press('Control+z');
	await expect(canvas.locator(':scope > g > path')).toHaveCount(0);
	await page.keyboard.press('Control+Shift+z');
	await expect(canvas.locator(':scope > g > path')).toHaveCount(1);
	await page.getByRole('button', { name: 'Text', exact: true }).click();
	await canvas.click({ position: { x: bounds.width * 0.2, y: bounds.height * 0.48 } });
	const textInput = page.getByLabel('Drawing text');
	await expect(textInput).toBeFocused();
	await textInput.fill('Harbor label');
	await textInput.press('Enter');
	await expect(canvas.getByText('Harbor label', { exact: true })).toBeVisible();
	await page.keyboard.press('Control+z');
	await expect(canvas.getByText('Harbor label', { exact: true })).toHaveCount(0);
	await page.keyboard.press('Control+y');
	await expect(canvas.getByText('Harbor label', { exact: true })).toBeVisible();

	await page.getByRole('button', { name: 'Rectangle or square' }).click();
	await page.mouse.move(bounds.x + bounds.width * 0.18, bounds.y + bounds.height * 0.55);
	await page.mouse.down();
	await page.mouse.move(bounds.x + bounds.width * 0.42, bounds.y + bounds.height * 0.78, {
		steps: 5
	});
	await page.mouse.up();
	await expect(canvas.locator('rect[fill="none"]')).toHaveCount(1);

	await page.getByRole('button', { name: 'Ellipse or circle' }).click();
	await page.mouse.move(bounds.x + bounds.width * 0.56, bounds.y + bounds.height * 0.52);
	await page.mouse.down();
	await page.mouse.move(bounds.x + bounds.width * 0.82, bounds.y + bounds.height * 0.78, {
		steps: 5
	});
	await page.mouse.up();
	await expect(canvas.locator('ellipse')).toHaveCount(1);

	await page.getByRole('button', { name: 'Eraser' }).click();
	await dialog.getByRole('slider', { name: 'Size' }).fill('72');
	await page.mouse.click(bounds.x + bounds.width * 0.3, bounds.y + bounds.height * 0.66);
	await expect(canvas.locator('rect[fill="none"]')).toHaveCount(1);
	await page.getByRole('button', { name: 'Undo drawing action' }).click();
	await expect(canvas.locator('mask')).toHaveCount(0);
	await page.mouse.move(bounds.x + bounds.width * 0.12, bounds.y + bounds.height * 0.66);
	await page.mouse.down();
	await page.mouse.move(bounds.x + bounds.width * 0.28, bounds.y + bounds.height * 0.66, {
		steps: 8
	});
	await page.mouse.up();
	await expect(canvas.locator('mask')).toHaveCount(4);
	await expect(canvas.locator('rect[fill="none"]')).toHaveCount(1);
	await page.getByRole('button', { name: 'Undo drawing action' }).click();
	await expect(canvas.locator('mask')).toHaveCount(0);
	await page.getByRole('button', { name: 'Redo drawing action' }).click();
	await expect(canvas.locator('mask')).toHaveCount(4);

	await dialog.getByRole('button', { name: 'Done' }).click();
	await expect(dialog).toBeHidden();
	const drawing = page.locator('.writing-surface img[data-drawing-asset-id]');
	await expect(drawing).toBeVisible();
	await expect(drawing).toHaveAttribute('alt', 'Editable drawing');
	await page.waitForTimeout(700);

	await page.reload();
	await expect(page.getByLabel('Page title')).toHaveValue('Glass Harbor');
	await expect(drawing).toBeVisible();
	await drawing.dblclick();
	await expect(dialog).toBeVisible();
	await expect(canvas.locator(':scope > g > path')).toHaveCount(1);
	await expect(canvas.locator('rect[fill="none"]')).toHaveCount(1);
	await expect(canvas.locator('ellipse')).toHaveCount(1);
	await expect(canvas.getByText('Harbor label', { exact: true })).toBeVisible();
	await expect(canvas.locator('mask')).toHaveCount(4);

	await page.getByRole('button', { name: 'Straight line' }).click();
	const reopenedBounds = await canvas.boundingBox();
	if (!reopenedBounds) throw new Error('The reopened drawing canvas was not measurable.');
	await page.mouse.move(
		reopenedBounds.x + reopenedBounds.width * 0.2,
		reopenedBounds.y + reopenedBounds.height * 0.4
	);
	await page.mouse.down();
	await page.mouse.move(
		reopenedBounds.x + reopenedBounds.width * 0.8,
		reopenedBounds.y + reopenedBounds.height * 0.4,
		{ steps: 6 }
	);
	await page.mouse.up();
	await expect(canvas.locator('line')).toHaveCount(1);
	await page.getByRole('button', { name: 'Text', exact: true }).click();
	await canvas.getByText('Harbor label', { exact: true }).click();
	await expect(textInput).toHaveValue('Harbor label');
	await textInput.fill('Glass Harbor');
	await textInput.press('Enter');
	await expect(canvas.getByText('Glass Harbor', { exact: true })).toBeVisible();
	await dialog.getByRole('button', { name: 'Done' }).click();
	await page.waitForTimeout(700);
	await page.reload();
	await drawing.dblclick();
	await expect(canvas.locator('line')).toHaveCount(1);
	await expect(canvas.getByText('Glass Harbor', { exact: true })).toBeVisible();
	await expect(canvas.locator('mask')).toHaveCount(4);
});

test('anchors comment threads to edited manuscript text and persists replies', async ({ page }) => {
	await createNovel(page, 'Commented Story');
	const editor = page.locator('.writing-surface');
	await editor.fill('The harbor bells sounded before dawn.');

	await editor.evaluate((element) => {
		const text = element.querySelector('p')?.firstChild;
		if (!text) throw new Error('The manuscript text was not available.');
		const range = document.createRange();
		range.setStart(text, 4);
		range.setEnd(text, 10);
		const selection = window.getSelection();
		selection?.removeAllRanges();
		selection?.addRange(range);
		element.dispatchEvent(new Event('selectionchange', { bubbles: true }));
	});

	const addComment = page.getByRole('button', { name: 'Add comment to selected text' });
	await expect(addComment).toBeEnabled();
	const selectionComment = page.getByRole('button', { name: 'Comment on selected text' });
	await expect(selectionComment).toBeVisible();
	await selectionComment.click();
	await page.getByLabel('Add a comment').fill('Make this image more ominous.');
	await page.getByRole('button', { name: 'Comment', exact: true }).click();

	const anchor = page.locator('.comment-anchor');
	await expect(anchor).toHaveText('harbor');
	await page.getByLabel('Reply', { exact: true }).fill('Perhaps the bells are warning the town.');
	await page.getByRole('button', { name: 'Send reply' }).click();
	await expect(page.getByText('Perhaps the bells are warning the town.')).toBeVisible();

	await editor.focus();
	await page.keyboard.press('Control+Home');
	await page.keyboard.type('At dusk, ');
	await expect(editor).toContainText('At dusk, The harbor bells');
	await expect(anchor).toHaveText('harbor');

	await anchor.evaluate((element) => {
		const contentEditable = element.closest<HTMLElement>('[contenteditable="true"]');
		const text = element.firstChild;
		if (!contentEditable || !text) throw new Error('The comment anchor was not editable.');
		contentEditable.focus();
		const range = document.createRange();
		range.selectNodeContents(text);
		const selection = window.getSelection();
		selection?.removeAllRanges();
		selection?.addRange(range);
		document.dispatchEvent(new Event('selectionchange'));
	});
	await page.keyboard.type('quay');
	await expect(anchor).toHaveText('quay');
	await expect(page.getByRole('button', { name: 'Go to comment on: quay' })).toBeVisible();
	await page.waitForTimeout(700);

	await page.reload();
	await expect(editor).toContainText('At dusk, The quay bells');
	await expect(anchor).toHaveText('quay');
	await page.getByRole('button', { name: 'Show comments (1)' }).click();
	await expect(page.getByRole('button', { name: 'Go to comment on: quay' })).toBeVisible();
	await expect(page.getByText('Make this image more ominous.')).toBeVisible();
	await expect(page.getByText('Perhaps the bells are warning the town.')).toBeVisible();
	await expect(page.getByText('Original text removed')).toHaveCount(0);

	await page.getByRole('button', { name: 'Close comments' }).click();
	await anchor.click();
	const commentsPanel = page.getByLabel('Comments panel');
	await expect(commentsPanel).toBeVisible();

	await page.setViewportSize({ width: 390, height: 844 });
	const mobilePanelFits = await commentsPanel.evaluate((element) => {
		const bounds = element.getBoundingClientRect();
		return (
			bounds.left >= -1 &&
			bounds.right <= window.innerWidth + 1 &&
			bounds.top >= 0 &&
			bounds.bottom <= window.innerHeight + 1 &&
			document.documentElement.scrollWidth <= document.documentElement.clientWidth
		);
	});
	expect(mobilePanelFits).toBe(true);

	page.once('dialog', (dialog) => dialog.accept());
	await page
		.getByRole('button', { name: 'Delete comment: Perhaps the bells are warning the town.' })
		.click();
	await expect(page.getByText('Perhaps the bells are warning the town.')).toHaveCount(0);
	await expect(page.getByText('Make this image more ominous.')).toBeVisible();
	await page.waitForTimeout(350);

	page.once('dialog', (dialog) => dialog.accept());
	await page.getByRole('button', { name: 'Delete conversation about: quay' }).click();
	await expect(anchor).toHaveCount(0);
	await expect(editor).toContainText('At dusk, The quay bells');
	await expect(page.getByText('No comments yet.')).toBeVisible();
	await page.waitForTimeout(350);

	await page.reload();
	await expect(editor).toContainText('At dusk, The quay bells');
	await expect(anchor).toHaveCount(0);
});

test('expands the manuscript into distraction-free writing mode', async ({ page }) => {
	await createNovel(page, 'Focused Story');
	const paper = page.locator('.paper');
	const standardWidth = await paper.evaluate((element) => element.getBoundingClientRect().width);

	await page.getByRole('button', { name: 'Start focus mode' }).click();
	await expect(page.locator('.workspace-page')).toHaveClass(/distraction-free/);
	await expect(page.locator('.topbar')).toBeHidden();
	await expect(page.locator('.sidebar')).toBeHidden();
	await expect(page.locator('.item-header')).toBeHidden();
	await expect(page.locator('.status-bar')).toBeHidden();
	await expect(page.getByRole('button', { name: 'Leave focus mode' })).toBeVisible();
	const focusedWidth = await paper.evaluate((element) => element.getBoundingClientRect().width);
	expect(focusedWidth).toBeGreaterThan(standardWidth);
	const focusTitle = page.getByLabel('Page title in focus mode');
	await expect(focusTitle).toHaveValue('Chapter 1');
	const titleCenterOffset = await focusTitle.evaluate((element) => {
		const bounds = element.getBoundingClientRect();
		return Math.abs((bounds.left + bounds.right) / 2 - window.innerWidth / 2);
	});
	expect(titleCenterOffset).toBeLessThan(2);
	await focusTitle.fill('Opening Scene');
	await focusTitle.press('Enter');
	await expect(
		page.getByRole('button', { name: 'Open focus navigation, current item: Opening Scene' })
	).toBeVisible();

	await page
		.getByRole('button', { name: 'Open focus navigation, current item: Opening Scene' })
		.click();
	const focusNavigation = page.locator('.focus-navigation-menu');
	await expect(focusNavigation).toBeVisible();
	const menuPresentation = await focusNavigation.evaluate((element) => {
		const bounds = element.getBoundingClientRect();
		const toolbarBounds = document.querySelector('.toolbar')?.getBoundingClientRect();
		const foreground = document.elementFromPoint(bounds.left + 8, bounds.top + 8);
		return {
			height: bounds.height,
			extendsBelowToolbar: bounds.bottom > (toolbarBounds?.bottom ?? 0) + 200,
			isForeground: foreground === element || element.contains(foreground)
		};
	});
	expect(menuPresentation.height).toBeGreaterThan(300);
	expect(menuPresentation.extendsBelowToolbar).toBe(true);
	expect(menuPresentation.isForeground).toBe(true);
	await expect(focusNavigation.getByText('Work', { exact: true })).toBeVisible();
	await expect(focusNavigation.getByText('Front pages', { exact: true })).toBeVisible();
	await expect(focusNavigation.getByText('Chapters', { exact: true })).toBeVisible();
	await expect(focusNavigation.getByText('Back pages', { exact: true })).toBeVisible();
	await expect(focusNavigation.getByText('Notes', { exact: true })).toBeVisible();
	for (const section of ['Characters', 'Places', 'Plotlines', 'Planning']) {
		await expect(focusNavigation.getByText(section, { exact: true })).toBeVisible();
	}
	const addFrontPage = page.getByRole('button', {
		name: 'Add a front page from focus navigation'
	});
	await addFrontPage.click();
	for (const pageType of ['Title page', 'Copyright', 'Dedication', 'Epigraph', 'Preface']) {
		await expect(
			focusNavigation.getByRole('button', { name: pageType, exact: true })
		).toBeVisible();
	}
	await addFrontPage.click();
	const addBackPage = page.getByRole('button', {
		name: 'Add a back page from focus navigation'
	});
	await addBackPage.click();
	for (const pageType of ['Acknowledgements', 'About the author']) {
		await expect(
			focusNavigation.getByRole('button', { name: pageType, exact: true })
		).toBeVisible();
	}
	await addBackPage.click();
	for (const section of ['characters', 'places', 'plotlines', 'planning']) {
		await expect(
			page.getByRole('button', { name: `Add ${section} from focus navigation` })
		).toBeVisible();
	}

	await page.getByRole('button', { name: 'Add chapter from focus navigation' }).click();
	await expect(
		page.getByRole('button', { name: 'Open focus navigation, current item: Chapter 2' })
	).toBeVisible();
	await expect(page.locator('.workspace-page')).toHaveClass(/distraction-free/);
	await page
		.getByRole('button', { name: 'Open focus navigation, current item: Chapter 2' })
		.click();
	await page.getByRole('button', { name: 'Open chapter 1: Opening Scene' }).click();
	await expect(
		page.getByRole('button', { name: 'Open focus navigation, current item: Opening Scene' })
	).toBeVisible();

	await page.getByRole('button', { name: 'Leave focus mode' }).click();
	await expect(page.locator('.workspace-page')).not.toHaveClass(/distraction-free/);
	await expect(page.locator('.topbar')).toBeVisible();
	await expect(page.getByLabel('Page title')).toHaveValue('Opening Scene');
	await page.reload();
	await expect(page.getByLabel('Page title')).toHaveValue('Opening Scene');

	await page.getByRole('button', { name: 'Start focus mode' }).click();
	await page.keyboard.press('Escape');
	await expect(page.locator('.workspace-page')).not.toHaveClass(/distraction-free/);
});

test('uses the full phone width and safe areas in distraction-free mode', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await createNovel(page, 'Pocket Story');
	await page.getByRole('button', { name: 'Start focus mode' }).click();

	const workspace = page.locator('.workspace-page');
	await workspace.evaluate((element) => {
		const workspaceElement = element as HTMLElement;
		workspaceElement.style.setProperty('--safe-area-top', '28px');
		workspaceElement.style.setProperty('--safe-area-right', '12px');
		workspaceElement.style.setProperty('--safe-area-bottom', '18px');
		workspaceElement.style.setProperty('--safe-area-left', '12px');
	});

	const presentation = await page.evaluate(() => {
		const focusTopbar = document.querySelector<HTMLElement>('.focus-topbar');
		const focusTitle = document.querySelector<HTMLElement>('.focus-title');
		const toolbar = document.querySelector<HTMLElement>('.toolbar');
		const writingColumn = document.querySelector<HTMLElement>('.writing-column');
		const paper = document.querySelector<HTMLElement>('.paper');
		const writingSurface = document.querySelector<HTMLElement>('.writing-surface');
		const heading = document.querySelector<HTMLElement>('.typeset-document-heading');
		if (
			!focusTopbar ||
			!focusTitle ||
			!toolbar ||
			!writingColumn ||
			!paper ||
			!writingSurface ||
			!heading
		) {
			throw new Error('The mobile writing layout did not render.');
		}

		const focusBounds = focusTopbar.getBoundingClientRect();
		const titleBounds = focusTitle.getBoundingClientRect();
		const toolbarBounds = toolbar.getBoundingClientRect();
		const columnBounds = writingColumn.getBoundingClientRect();
		const paperBounds = paper.getBoundingClientRect();
		const headingBounds = heading.getBoundingClientRect();
		const writingStyle = getComputedStyle(writingSurface);
		const paddingInline =
			Number.parseFloat(writingStyle.paddingLeft) + Number.parseFloat(writingStyle.paddingRight);

		return {
			focusPaddingTop: Number.parseFloat(getComputedStyle(focusTopbar).paddingTop),
			toolbarOffset: Math.abs(toolbarBounds.top - focusBounds.bottom),
			paperGap: Math.abs(paperBounds.top - toolbarBounds.bottom),
			paperWidthDifference: Math.abs(paperBounds.width - columnBounds.width),
			contentWidthRatio: (paperBounds.width - paddingInline) / paperBounds.width,
			headingTopOffset: headingBounds.top - paperBounds.top,
			titleCenterOffset: Math.abs(titleBounds.left + titleBounds.width / 2 - window.innerWidth / 2),
			hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth
		};
	});

	expect(presentation.focusPaddingTop).toBeGreaterThanOrEqual(34);
	expect(presentation.toolbarOffset).toBeLessThanOrEqual(1);
	expect(presentation.paperGap).toBeLessThanOrEqual(1);
	expect(presentation.paperWidthDifference).toBeLessThanOrEqual(1);
	expect(presentation.contentWidthRatio).toBeGreaterThan(0.86);
	expect(presentation.headingTopOffset).toBeLessThanOrEqual(50);
	expect(presentation.titleCenterOffset).toBeLessThanOrEqual(2);
	expect(presentation.hasHorizontalOverflow).toBe(false);
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

test('uses writing flow by default and previews the PDF at the visible text', async ({ page }) => {
	await createNovel(page, 'Previewed Story');
	const editor = page.locator('.writing-surface');
	const paragraphs = Array.from(
		{ length: 35 },
		(_, index) =>
			`Anchor passage ${index + 1}. The road crossed the valley while a unique compass marker ${index + 1} pointed toward the distant harbor and the evening light changed over the hills.`
	);
	await editor.fill(paragraphs.join('\n\n'));
	await page.waitForTimeout(1_800);

	await expect(page.getByRole('switch', { name: 'Book formatting' })).toHaveCount(0);
	await expect(page.locator('.editor-shell')).toHaveClass(/writing-view/);
	await expect(page.getByLabel('Book page heading')).toBeVisible();

	const writingPresentation = await page.evaluate(() => {
		const paper = document.querySelector<HTMLElement>('.paper');
		const paragraph = document.querySelector<HTMLElement>('.writing-surface p + p');
		if (!paper || !paragraph) return undefined;
		const style = getComputedStyle(paragraph);
		return {
			paperWidth: paper.getBoundingClientRect().width,
			textAlign: style.textAlign,
			textIndent: Number.parseFloat(style.textIndent),
			hyphens: style.hyphens,
			fontFamily: style.fontFamily,
			fontSize: style.fontSize,
			lineHeight: style.lineHeight,
			marginBottom: Number.parseFloat(style.marginBottom)
		};
	});

	expect(writingPresentation).toBeDefined();
	expect(writingPresentation!.paperWidth).toBeLessThanOrEqual(736);
	expect(writingPresentation!.textAlign).toBe('left');
	expect(writingPresentation!.textIndent).toBe(0);
	expect(writingPresentation!.hyphens).toBe('none');
	expect(writingPresentation!.fontFamily).toContain('Libre Baskerville');
	expect(writingPresentation!.fontSize).toBe('16px');
	expect(Number.parseFloat(writingPresentation!.lineHeight)).toBeGreaterThan(20);
	expect(writingPresentation!.marginBottom).toBeGreaterThan(10);

	const editorArea = page.locator('.editor-area');
	const maximumScroll = await editorArea.evaluate(
		(element) => element.scrollHeight - element.clientHeight
	);
	await editorArea.hover();
	await page.mouse.wheel(0, maximumScroll * 0.7);
	await expect
		.poll(() => editorArea.evaluate((element) => element.scrollTop))
		.toBeGreaterThan(1_000);
	await page.getByRole('button', { name: 'Preview finished book' }).click();

	const previewDialog = page.getByRole('dialog', { name: 'Book preview' });
	await expect(previewDialog).toBeVisible();
	await expect(previewDialog).toContainText('showing the passage you were reading', {
		timeout: 30_000
	});
	const previewFrame = previewDialog.getByTitle('Finished book pages');
	await expect(previewFrame).toHaveAttribute('src', /#page=/, { timeout: 30_000 });
	const previewSource = await previewFrame.getAttribute('src');
	if (!previewSource) throw new Error('The rendered PDF preview did not have a source.');
	const previewParameters = new URLSearchParams(previewSource.split('#')[1]);
	expect(Number(previewParameters.get('page'))).toBeGreaterThan(1);
	expect(previewParameters.get('view')).toMatch(/^FitH,\d+$/);
	expect(previewParameters.has('search')).toBe(false);
	await previewDialog.getByRole('button', { name: 'Close' }).click();
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
	await page
		.locator('.writing-surface')
		.fill(
			'A short chapter for export begins beneath the heading, where every ordinary paragraph should form a calm, even-edged block of readable book text without losing its natural rhythm.'
		);
	await page.locator('.writing-surface').press('Control+Shift+L');
	await page.locator('.writing-surface').press('Control+Shift+E');
	await page.waitForTimeout(700);

	const typesetHeading = page.getByLabel('Book page heading');
	await expect(typesetHeading).toContainText('Chapter 1');
	await expect(typesetHeading).toContainText('The Lantern Room');
	const editorWritingFlowMatches = await page.evaluate(() => {
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
		const bodyStyle = getComputedStyle(body);
		const writingStyle = getComputedStyle(writingSurface);
		return (
			headingBounds.top > pageBounds.top &&
			headingBounds.bottom < bodyBounds.top &&
			bodyBounds.bottom < pageBounds.bottom &&
			Math.abs(
				titleBounds.left + titleBounds.width / 2 - (pageBounds.left + pageBounds.width / 2)
			) < 1 &&
			headingStyle.fontFamily === writingStyle.fontFamily &&
			bodyStyle.textAlign === 'left' &&
			bodyStyle.textAlignLast === 'auto' &&
			Number.parseFloat(bodyStyle.textIndent) === 0 &&
			writingStyle.hyphens === 'none'
		);
	});
	expect(editorWritingFlowMatches).toBe(true);

	await page.getByText('Export', { exact: true }).click();
	const pdfDownload = page.waitForEvent('download');
	await page.locator('.export-menu').getByRole('button', { name: /PDF/ }).click();
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
	expect(firstPageText).toContain('A short chapter for export');
	expect(firstPageText).toContain('Page 1');
	const titleItem = firstPageItems.find((item) => item.str.includes('The Lantern Room'));
	const bodyItem = firstPageItems.find((item) => item.str.includes('A short chapter for export'));
	if (!titleItem || !bodyItem)
		throw new Error('The PDF title or body text could not be positioned.');
	expect(titleItem.fontSize).toBeGreaterThan(bodyItem.fontSize);
	expect(titleItem.y).toBeGreaterThan(bodyItem.y);
	expect(Math.abs(titleItem.x + titleItem.width / 2 - 216)).toBeLessThan(6);
	expect(bodyItem.x).toBeCloseTo(50, 0);
	expect(bodyItem.width).toBeGreaterThan(320);
	expect(await captureRenderedPdfFooter(page, pdfPath)).toMatchSnapshot(
		'visible-default-page-number-footer.png',
		{ maxDiffPixelRatio: 0.02 }
	);

	await page.getByText('Export', { exact: true }).click();
	const epubDownload = page.waitForEvent('download');
	await page.getByRole('button', { name: /EPUB/ }).click();
	expect((await epubDownload).suggestedFilename()).toBe('exportable-story.epub');

	await page.getByRole('button', { name: 'Book settings' }).click();
	await page.getByLabel('Reading style').selectOption('modern');
	await page.getByRole('button', { name: 'Save book settings' }).click();
	await expect(page.getByRole('dialog')).toHaveCount(0);
	await page.getByText('Export', { exact: true }).click();
	const modernPdfDownload = page.waitForEvent('download');
	await page.locator('.export-menu').getByRole('button', { name: /PDF/ }).click();
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
	await page.getByLabel('Where page counting begins').selectOption('restart');
	await page.getByLabel('Restart page numbering at').fill('7');
	await page.getByLabel('Page number style').selectOption('roman');
	await page.getByLabel('Page number position').selectOption('bottom-center');
	await page.getByLabel('How page numbers look').fill('Folio #');
	await expect(page.getByLabel('Page number example')).toContainText('Folio vii');
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
	await expect(page.getByLabel('How page numbers look')).toHaveValue('Folio #');
	await page.getByRole('button', { name: 'Save book settings' }).click();
	await expect(page.getByRole('dialog')).toHaveCount(0);

	await page.getByText('Export', { exact: true }).click();
	const pdfDownload = page.waitForEvent('download');
	await page.locator('.export-menu').getByRole('button', { name: /PDF/ }).click();
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
	await page.getByLabel('Chapter number wording').fill('Scene #');
	await page.getByRole('checkbox', { name: 'Show the chapter title' }).uncheck();
	await expect(page.getByLabel('Chapter heading example')).toContainText('Scene 1');
	await page.getByRole('button', { name: 'Save book settings' }).click();
	await expect(page.getByLabel('Book page heading')).toContainText('Scene 1');
	await expect(page.getByLabel('Book page heading')).not.toContainText('The Threshold');

	await page.getByRole('button', { name: 'Insert chapter after The Threshold' }).click();
	await page.getByRole('button', { name: 'Chapter heading' }).click();
	await page.getByRole('checkbox', { name: /Use the same heading as other chapters/ }).uncheck();
	await page.getByRole('checkbox', { name: /Show the chapter number/ }).uncheck();
	await page.getByRole('button', { name: 'Save chapter heading' }).click();
	await expect(page.getByLabel('Book page heading')).toHaveCount(0);

	await page.reload();
	await expect(page.getByLabel('Page title')).toHaveValue('Chapter 2');
	await expect(page.getByLabel('Book page heading')).toHaveCount(0);
	await page.getByRole('button', { name: /1 The Threshold/ }).click();
	await expect(page.getByLabel('Book page heading')).toContainText('Scene 1');

	await page.getByText('Export', { exact: true }).click();
	const pdfDownload = page.waitForEvent('download');
	await page.locator('.export-menu').getByRole('button', { name: /PDF/ }).click();
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
	await page.getByLabel('Book size').selectOption('a5');
	await page.getByLabel('Reading style').selectOption('modern');
	const frontCover = page.locator('.cover-card').filter({ hasText: 'Front cover' });
	await frontCover.locator('input[type=file]').setInputFiles({
		name: 'front-cover.png',
		mimeType: 'image/png',
		buffer: await readFile('static/apple-touch-icon.png')
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
	await page.getByLabel('Front cover crop position').selectOption('top-left');
	await page.getByLabel('Back cover crop position').selectOption('bottom-right');
	await page.getByRole('button', { name: 'Save book settings' }).click();
	await page.getByRole('button', { name: 'Book settings', exact: true }).click();
	await expect(page.getByLabel('Front cover crop position')).toHaveValue('top-left');
	await expect(page.getByLabel('Back cover crop position')).toHaveValue('bottom-right');
	await page.getByRole('button', { name: 'Save book settings' }).click();
	await page.getByText('Export', { exact: true }).click();
	const coverPdfDownload = page.waitForEvent('download');
	await page.locator('.export-menu').getByRole('button', { name: /PDF/ }).click();
	const coverPdfPath = await (await coverPdfDownload).path();
	if (!coverPdfPath) throw new Error('The illustrated PDF was not available for verification.');
	const coverPdfBytes = new Uint8Array(await readFile(coverPdfPath));
	expect(new TextDecoder().decode(coverPdfBytes.slice(0, 5))).toBe('%PDF-');
	expect((await extractTextItems(coverPdfBytes)).totalPages).toBe(5);

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
