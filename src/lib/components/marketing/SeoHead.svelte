<script lang="ts">
	import { absoluteUrl, SOCIAL_IMAGE_PATH, SITE_NAME } from '$lib/marketing/site';
	import type { JsonObject } from '$lib/marketing/seo';

	let {
		title,
		description,
		path,
		structuredData
	}: {
		title: string;
		description: string;
		path: string;
		structuredData: JsonObject;
	} = $props();

	const canonical = $derived(absoluteUrl(path));
	const socialImage = absoluteUrl(SOCIAL_IMAGE_PATH);
	const jsonLd = $derived(JSON.stringify(structuredData).replaceAll('<', '\\u003c'));
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
	<link rel="canonical" href={canonical} />
	<meta property="og:type" content="website" />
	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:locale" content="en_US" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={canonical} />
	<meta property="og:image" content={socialImage} />
	<meta property="og:image:type" content="image/png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="WriteANovel — write the novel, shape the book" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={socialImage} />
	<meta name="twitter:image:alt" content="WriteANovel — write the novel, shape the book" />
	<svelte:element this={"script"} type="application/ld+json">{jsonLd}</svelte:element>
</svelte:head>
