import { SOCIAL_IMAGE_PATH, SITE_NAME, SITE_ORIGIN, absoluteUrl, type MarketingPage } from './site';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | readonly JsonValue[];
export type JsonObject = { readonly [key: string]: JsonValue };

const websiteId = `${SITE_ORIGIN}/#website`;
const softwareId = `${SITE_ORIGIN}/#software`;

export function homeStructuredData(description: string): JsonObject {
	return {
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'WebSite',
				'@id': websiteId,
				url: `${SITE_ORIGIN}/`,
				name: SITE_NAME,
				alternateName: 'Write A Novel',
				inLanguage: 'en'
			},
			{
				'@type': 'SoftwareApplication',
				'@id': softwareId,
				name: SITE_NAME,
				url: `${SITE_ORIGIN}/`,
				description,
				applicationCategory: 'BusinessApplication',
				applicationSubCategory: 'Novel writing software',
				operatingSystem: 'Any',
				browserRequirements: 'Requires a modern web browser',
				image: absoluteUrl(SOCIAL_IMAGE_PATH),
				featureList: [
					'Offline-first novel writing',
					'Automatic chapter numbering',
					'Character, environment, plotline, and planning notes',
					'WYSIWYG book typesetting',
					'Raster image and SVG placement',
					'PDF and EPUB export'
				],
				offers: {
					'@type': 'Offer',
					name: 'Free local writing mode',
					price: '0',
					priceCurrency: 'USD'
				}
			}
		]
	};
}

export function marketingPageStructuredData(page: MarketingPage): JsonObject {
	const pageUrl = absoluteUrl(`/${page.slug}`);
	return {
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'WebPage',
				'@id': `${pageUrl}#webpage`,
				url: pageUrl,
				name: page.title,
				description: page.description,
				isPartOf: { '@id': websiteId },
				about: { '@id': softwareId },
				inLanguage: 'en'
			},
			{
				'@type': 'BreadcrumbList',
				itemListElement: [
					{
						'@type': 'ListItem',
						position: 1,
						name: 'Home',
						item: `${SITE_ORIGIN}/`
					},
					{
						'@type': 'ListItem',
						position: 2,
						name: page.heading,
						item: pageUrl
					}
				]
			}
		]
	};
}
