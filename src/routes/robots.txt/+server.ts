import { SITE_ORIGIN } from '$lib/marketing/site';
import type { RequestHandler } from './$types';

export const prerender = true;

export const GET: RequestHandler = () =>
	new Response(`User-agent: *\nAllow: /\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`, {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' }
	});
