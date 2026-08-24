import { describe, expect, it } from 'vitest';
import { homeStructuredData, marketingPageStructuredData } from './seo';
import {
	absoluteUrl,
	getMarketingPage,
	marketingPages,
	publicMarketingPaths,
	SITE_ORIGIN
} from './site';

describe('marketing SEO content', () => {
	it('keeps indexable routes, titles, and descriptions unique', () => {
		const slugs = marketingPages.map((page) => page.slug);
		const titles = marketingPages.map((page) => page.title);
		const descriptions = marketingPages.map((page) => page.description);

		expect(new Set(slugs).size).toBe(slugs.length);
		expect(new Set(titles).size).toBe(titles.length);
		expect(new Set(descriptions).size).toBe(descriptions.length);
		expect(publicMarketingPaths).toEqual(['/', ...slugs.map((slug) => `/${slug}`)]);
	});

	it('uses concise search snippets and substantial page content', () => {
		for (const page of marketingPages) {
			expect(page.title.length).toBeLessThanOrEqual(70);
			expect(page.description.length).toBeGreaterThanOrEqual(120);
			expect(page.description.length).toBeLessThanOrEqual(170);
			expect(page.sections.length).toBeGreaterThanOrEqual(3);
			expect(
				page.sections.flatMap((section) => section.paragraphs).join(' ').length
			).toBeGreaterThan(700);
		}
	});

	it('resolves canonical URLs only against the production origin', () => {
		expect(absoluteUrl('/novel-planning')).toBe(`${SITE_ORIGIN}/novel-planning`);
		expect(getMarketingPage('novel-planning')?.heading).toContain('Novel planning software');
		expect(getMarketingPage('not-a-page')).toBeUndefined();
	});

	it('generates truthful website, software, webpage, and breadcrumb schemas', () => {
		const homeSchema = JSON.stringify(homeStructuredData('A writing application.'));
		const featurePage = getMarketingPage('features');
		if (!featurePage) throw new Error('The features page is required.');
		const pageSchema = JSON.stringify(marketingPageStructuredData(featurePage));

		expect(homeSchema).toContain('SoftwareApplication');
		expect(homeSchema).toContain('Free local writing mode');
		expect(homeSchema).not.toContain('AggregateRating');
		expect(pageSchema).toContain('BreadcrumbList');
		expect(pageSchema).toContain(`${SITE_ORIGIN}/features`);
	});
});
