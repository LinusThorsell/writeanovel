import { absoluteUrl, publicMarketingPaths } from '$lib/marketing/site';
import type { RequestHandler } from './$types';

export const prerender = true;

export const GET: RequestHandler = () => {
	const urls = publicMarketingPaths
		.map((path) => `  <url><loc>${absoluteUrl(path)}</loc></url>`)
		.join('\n');
	const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

	return new Response(sitemap, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=0, s-maxage=86400'
		}
	});
};
