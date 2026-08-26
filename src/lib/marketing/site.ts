export const SITE_NAME = 'WriteANovel';
export const SITE_ORIGIN = 'https://writeanovel.linus.solutions';
export const SOCIAL_IMAGE_PATH = '/social-card.png';

export type MarketingPoint = {
	title: string;
	text: string;
};

export type MarketingSection = {
	eyebrow: string;
	heading: string;
	paragraphs: readonly string[];
	points?: readonly MarketingPoint[];
};

export type MarketingFaq = {
	question: string;
	answer: string;
};

export type MarketingPage = {
	slug: string;
	title: string;
	description: string;
	eyebrow: string;
	heading: string;
	introduction: string;
	highlights: readonly string[];
	sections: readonly MarketingSection[];
	faq: readonly MarketingFaq[];
	relatedSlugs: readonly string[];
};

export const marketingPages = [
	{
		slug: 'features',
		title: 'Novel Writing Software Features | WriteANovel',
		description:
			'Plan, draft, organize, format, illustrate, and export complete books with private novel writing software that works without internet.',
		eyebrow: 'A complete writing studio',
		heading: 'Novel writing software that follows the whole book',
		introduction:
			'WriteANovel keeps drafting, story planning, page design, and export in one calm workspace. Start without an account, arrange a manuscript without renaming files, and shape a finished book without rebuilding it in another tool.',
		highlights: [
			'Writing and formatting in one place',
			'Automatic chapter numbering',
			'Characters, places, plotlines, and plans',
			'PDF and EPUB export'
		],
		sections: [
			{
				eyebrow: 'Draft without friction',
				heading: 'A book editor made for chapters, not loose documents',
				paragraphs: [
					'Create as many novel projects as you need, then build each manuscript from ordered chapters and book pages. Insert a chapter anywhere and its displayed number changes automatically, so revisions never become a file-renaming exercise.',
					'The rich-text editor gives writers familiar controls for headings, emphasis, links, lists, quotations, alignment, undo, and redo. The page stays readable and focused while the underlying manuscript remains structured for later export.'
				],
				points: [
					{
						title: 'Multiple novels',
						text: 'Keep separate projects for active drafts, revisions, and the next idea.'
					},
					{
						title: 'Flexible chapters',
						text: 'Insert and reorder chapters while numbering stays correct automatically.'
					},
					{
						title: 'Real book pages',
						text: 'Add title, copyright, dedication, acknowledgements, and author pages.'
					}
				]
			},
			{
				eyebrow: 'Keep the story coherent',
				heading: 'Novel planning lives beside the manuscript',
				paragraphs: [
					'Character profiles, environments, plotlines, and general planning notes have a dedicated place beneath the chapter list. They stay attached to the correct novel and remain one click away while you draft.',
					'This is a chapter planner and story bible without the visual noise of a project-management board. The structure is explicit enough for a complex series and approachable enough for a first-time novelist.'
				]
			},
			{
				eyebrow: 'Finish as a book',
				heading: 'Format once, then export PDF and EPUB',
				paragraphs: [
					'Choose a finished book size and reading style, add front and back covers, and place images inside the manuscript. Artwork can be aligned and resized while you write.',
					'When the draft is ready, download a PDF for review or print and an EPUB for reading apps. Book pages, chapters, covers, and artwork all carry into the finished files.'
				]
			}
		],
		faq: [
			{
				question: 'Can I use WriteANovel without creating an account?',
				answer: 'Yes. Start immediately and your novels are saved on this device.'
			},
			{
				question: 'Does it support more than plain chapter text?',
				answer:
					'Yes. You can create opening and closing book pages, add covers, and place or resize images in the manuscript.'
			}
		],
		relatedSlugs: ['offline-novel-writing', 'novel-planning', 'book-typesetting']
	},
	{
		slug: 'offline-novel-writing',
		title: 'Offline Novel Writing App That Saves Locally | WriteANovel',
		description:
			'Write novels without an internet connection in a private writing studio that saves automatically on your device. No account is required.',
		eyebrow: 'Private-first by design',
		heading: 'An offline writing studio that keeps your novels local',
		introduction:
			'WriteANovel is built for the train, the cabin, and any place with an unreliable connection. Your novels are saved automatically on this device, and you can begin without creating an account.',
		highlights: [
			'No account required',
			'Saved automatically on your device',
			'Works without internet',
			'Private by default'
		],
		sections: [
			{
				eyebrow: 'Local and dependable',
				heading: 'Keep writing when the connection disappears',
				paragraphs: [
					'Open WriteANovel once while connected, and the writing studio stays ready when the internet is unavailable. Your novels, notes, book settings, and artwork remain close at hand.',
					'There is nothing extra to set up. Open your novel and keep writing wherever you are.'
				],
				points: [
					{
						title: 'Automatic saving',
						text: 'Your latest changes are saved as you write.'
					},
					{
						title: 'Ready anywhere',
						text: 'Keep writing even when the internet is unavailable.'
					},
					{
						title: 'Private by default',
						text: 'Your writing stays on this device unless you choose to download or share it.'
					}
				]
			},
			{
				eyebrow: 'Safe by default',
				heading: 'Your writing stays on your device',
				paragraphs: [
					'Your novels are saved automatically while you work. You do not need an account to start, and your writing stays private.',
					'Download a PDF or EPUB whenever you want an extra copy to keep or share.'
				]
			},
			{
				eyebrow: 'Practical privacy',
				heading: 'A private offline novel editor with understandable boundaries',
				paragraphs: [
					'“Local” means your novel is saved on this device. It does not leave the device unless you choose to download or share it.',
					'Removing the saved information from this device can also remove your novel, so downloading a PDF or EPUB from time to time is a sensible extra backup.'
				]
			}
		],
		faq: [
			{
				question: 'Can I write with airplane mode enabled?',
				answer: 'Yes. Open WriteANovel once while connected, then keep writing without internet.'
			},
			{
				question: 'Does writing without an account leave my device?',
				answer: 'No. It stays on this device unless you choose to download or share it.'
			}
		],
		relatedSlugs: ['features', 'novel-planning', 'book-typesetting']
	},
	{
		slug: 'novel-planning',
		title: 'Novel Planning Software for Chapters and Story Notes | WriteANovel',
		description:
			'Plan chapters, characters, environments, plotlines, and research beside your draft with straightforward novel planning software for writers.',
		eyebrow: 'Plan beside the prose',
		heading: 'Novel planning software without a project-management maze',
		introduction:
			'Good planning should help you return to the sentence, not turn a novel into a corporate dashboard. WriteANovel gives each project an ordered manuscript and a separate story-planning area that stays close to the work it supports.',
		highlights: [
			'Insert chapters at any point',
			'Automatic chapter numbering',
			'Character and environment notes',
			'Plotline and general planning pages'
		],
		sections: [
			{
				eyebrow: 'Structure that can change',
				heading: 'A chapter planner built for revision',
				paragraphs: [
					'Novel outlines rarely survive contact with the draft unchanged. Insert a new chapter between existing chapters and WriteANovel updates the visible numbering around it. You can concentrate on narrative order instead of maintaining filenames and labels.',
					'Front matter and back matter sit in their own parts of the book, so a title page or acknowledgements page never masquerades as Chapter 1. That same structure gives exports a more accurate reading order.'
				],
				points: [
					{
						title: 'Chapters',
						text: 'Draft scenes and chapters in an ordered manuscript with automatic numbering.'
					},
					{
						title: 'Book pages',
						text: 'Keep dedications, copyright, acknowledgements, and author material in place.'
					},
					{
						title: 'Story notes',
						text: 'Separate reference material from prose while keeping it inside the novel project.'
					}
				]
			},
			{
				eyebrow: 'A lightweight story bible',
				heading: 'Characters, environments, and plotlines have clear homes',
				paragraphs: [
					'Create a profile for a protagonist, a location note for an invented city, or a page that tracks the promise and payoff of a plotline. General planning pages can hold research, timelines, themes, or revision checklists.',
					'These categories are visible beside the chapters. A writer can capture an important detail without setting up a complicated filing system.'
				]
			},
			{
				eyebrow: 'From outline to final order',
				heading: 'Planning and production share one source of truth',
				paragraphs: [
					'Because planning and drafting belong to the same project, title changes and structural revisions do not create a trail of mismatched planning files. Open the novel and the relevant story material is already there.',
					'When it is time to export, only manuscript pages enter the PDF or EPUB. Planning notes remain useful working material rather than accidentally appearing in the finished book.'
				]
			}
		],
		faq: [
			{
				question: 'Can I add a chapter between two existing chapters?',
				answer:
					'Yes. Insert it at the chosen point and the chapter display numbers update automatically.'
			},
			{
				question: 'Are planning notes included in book exports?',
				answer:
					'No. Character, environment, plotline, and planning notes stay separate from the exported manuscript.'
			}
		],
		relatedSlugs: ['features', 'offline-novel-writing', 'book-typesetting']
	},
	{
		slug: 'book-typesetting',
		title: 'Book Formatting Software with PDF and EPUB Export | WriteANovel',
		description:
			'Turn a novel draft into a readable book with guided choices for page size, reading style, artwork, covers, and direct PDF and EPUB downloads.',
		eyebrow: 'Draft to finished book',
		heading: 'Book formatting made simple for novelists',
		introduction:
			'WriteANovel keeps book formatting inside the writing process. Choose how the book looks, add pages and artwork, then download PDF and EPUB files directly from the same novel.',
		highlights: [
			'Common finished book sizes',
			'Coordinated reading styles',
			'Images you can place and resize',
			'Direct PDF and EPUB downloads'
		],
		sections: [
			{
				eyebrow: 'Readable by default',
				heading: 'Start with sensible choices',
				paragraphs: [
					'Start with a common finished book size and a carefully matched reading style. Change either choice whenever you want a different feel for the book.',
					'Headings, paragraphs, quotations, emphasis, lists, and alignment stay visible while you write, so the result never depends on hidden instructions.'
				],
				points: [
					{
						title: 'Book sizes',
						text: 'Choose a practical finished-page size from a short list.'
					},
					{
						title: 'Reading styles',
						text: 'Apply a coordinated reading style instead of formatting every paragraph.'
					},
					{
						title: 'Book details',
						text: 'Keep the title, subtitle, author, language, and book number with the novel.'
					}
				]
			},
			{
				eyebrow: 'Illustrated when the story needs it',
				heading: 'Place and resize images while you write',
				paragraphs: [
					'Add photographs, illustrations, maps, or ornaments to the manuscript. Select an image to align it and drag its handles to the right size.',
					'Choose front and back covers separately from the images inside the book, so each one lands in the right place when you export.'
				]
			},
			{
				eyebrow: 'Files you can take elsewhere',
				heading: 'Download PDF for finished pages and EPUB for reading apps',
				paragraphs: [
					'PDF keeps the finished page design in a file suited to proofreading, sharing, and printing.',
					'EPUB keeps the reading order, chapters, book pages, covers, and images ready for reading apps and book stores. Both files belong to you.'
				]
			}
		],
		faq: [
			{
				question: 'Does PDF export download an actual PDF file?',
				answer: 'Yes. WriteANovel creates and downloads the PDF directly.'
			},
			{
				question: 'Can I add artwork as well as normal images?',
				answer: 'Yes. Images and artwork can be added, positioned, and resized while you write.'
			}
		],
		relatedSlugs: ['features', 'offline-novel-writing', 'novel-planning']
	}
] as const satisfies readonly MarketingPage[];

export const publicMarketingPaths = [
	'/',
	...marketingPages.map((page) => `/${page.slug}`)
] as const;

export function getMarketingPage(slug: string): MarketingPage | undefined {
	return marketingPages.find((page) => page.slug === slug);
}

export function absoluteUrl(path: string): string {
	return new URL(path, SITE_ORIGIN).href;
}
