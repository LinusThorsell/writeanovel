import { error } from '@sveltejs/kit';
import { getMarketingPage, marketingPages } from '$lib/marketing/site';
import type { EntryGenerator, PageLoad } from './$types';

export const prerender = true;

export const entries: EntryGenerator = () => marketingPages.map((page) => ({ slug: page.slug }));

export const load: PageLoad = ({ params }) => {
	const content = getMarketingPage(params.slug);
	if (!content) error(404, 'That writing guide does not exist.');

	return { content };
};
