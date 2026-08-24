import { expect, test } from '@playwright/test';

const canonicalOrigin = 'https://writeanovel.linus.solutions';
const publicPages = [
	{
		path: '/',
		title: 'WriteANovel — Offline Novel Writing Software & Book Editor',
		heading: 'Write the novel. Shape the book.',
		serverText: 'Write the novel.'
	},
	{
		path: '/features',
		title: 'Novel Writing Software Features | WriteANovel',
		heading: 'Novel writing software that follows the whole book',
		serverText: 'Novel writing software that follows the whole book'
	},
	{
		path: '/offline-novel-writing',
		title: 'Offline Novel Writing App That Saves Locally | WriteANovel',
		heading: 'An offline novel writing app that keeps free drafts local',
		serverText: 'An offline novel writing app that keeps free drafts local'
	},
	{
		path: '/novel-planning',
		title: 'Novel Planning Software for Chapters and Story Notes | WriteANovel',
		heading: 'Novel planning software without a project-management maze',
		serverText: 'Novel planning software without a project-management maze'
	},
	{
		path: '/book-typesetting',
		title: 'Book Typesetting Software with PDF and EPUB Export | WriteANovel',
		heading: 'WYSIWYG book typesetting software for novelists',
		serverText: 'WYSIWYG book typesetting software for novelists'
	}
] as const;

for (const publicPage of publicPages) {
	test(`${publicPage.path} has unique crawlable metadata and server-rendered content`, async ({
		page,
		request
	}) => {
		const response = await request.get(publicPage.path);
		expect(response.ok()).toBe(true);
		const html = await response.text();
		expect(html).toContain(publicPage.serverText);
		expect(html).toContain('application/ld+json');
		expect(html).not.toContain('type="module"');

		await page.goto(publicPage.path);
		await expect(page).toHaveTitle(publicPage.title);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(publicPage.heading);
		await expect(page.locator('meta[name="description"]')).toHaveCount(1);
		await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /index, follow/);
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
			'href',
			`${canonicalOrigin}${publicPage.path}`
		);
		await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
			'content',
			`${canonicalOrigin}/social-card.png`
		);
	});
}

test('publishes a focused sitemap and robots policy', async ({ request }) => {
	const robots = await request.get('/robots.txt');
	expect(robots.ok()).toBe(true);
	expect(await robots.text()).toContain(`Sitemap: ${canonicalOrigin}/sitemap.xml`);

	const sitemap = await request.get('/sitemap.xml');
	expect(sitemap.ok()).toBe(true);
	expect(sitemap.headers()['content-type']).toMatch(/^(application|text)\/xml/);
	const xml = await sitemap.text();
	for (const publicPage of publicPages) {
		expect(xml).toContain(`<loc>${canonicalOrigin}${publicPage.path}</loc>`);
	}
	expect(xml).not.toContain('/app');
	expect(xml).not.toContain('/reset-password');
});

test('keeps private utility routes out of search results', async ({ page, request }) => {
	const appResponse = await request.get('/app');
	expect(appResponse.ok()).toBe(true);
	expect(await appResponse.text()).toContain('noindex, nofollow, noarchive');

	await page.goto('/app');
	await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
		'content',
		'noindex, nofollow, noarchive'
	);
	await expect(page.getByRole('button', { name: 'Create your first novel' })).toBeVisible();
});
