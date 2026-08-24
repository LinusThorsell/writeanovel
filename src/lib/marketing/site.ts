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
			'Plan, draft, organize, typeset, illustrate, and export complete books with private, offline-first novel writing software built for long projects.',
		eyebrow: 'A complete writing studio',
		heading: 'Novel writing software that follows the whole book',
		introduction:
			'WriteANovel keeps drafting, story planning, page design, and export in one calm workspace. Start without an account, arrange a manuscript without renaming files, and shape a finished book without rebuilding it in another tool.',
		highlights: [
			'WYSIWYG manuscript editor',
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
				heading: 'Typeset once, then export PDF and EPUB',
				paragraphs: [
					'Choose a trim-size and typography preset, add front and back covers, and place raster images or SVG artwork inside the manuscript. Artwork can be aligned and resized directly in the writing surface.',
					'When the draft is ready, print the matching book layout or choose Save as PDF, then download an EPUB 3 file for e-readers. The exporters carry book pages, chapters, covers, and artwork into the finished files.'
				]
			}
		],
		faq: [
			{
				question: 'Can I use WriteANovel without creating an account?',
				answer:
					'Yes. Free writing starts immediately and saves novels in the browser on your device.'
			},
			{
				question: 'Does it support more than plain chapter text?',
				answer:
					'Yes. You can create front and back matter, add covers, and position raster images or SVG artwork in the manuscript.'
			}
		],
		relatedSlugs: ['offline-novel-writing', 'novel-planning', 'book-typesetting']
	},
	{
		slug: 'offline-novel-writing',
		title: 'Offline Novel Writing App That Saves Locally | WriteANovel',
		description:
			'Write novels offline in a private, local-first browser editor. No account is required, and free manuscripts never need to reach the database.',
		eyebrow: 'Private-first by design',
		heading: 'An offline novel writing app that keeps free drafts local',
		introduction:
			'WriteANovel is built for the train, the cabin, the unreliable connection, and the writer who simply does not want every unfinished sentence sent to a server. The free writing path stores projects in your browser and does not require registration.',
		highlights: [
			'No account required',
			'Browser-local manuscript storage',
			'Installable offline writing studio',
			'Explicit cloud migration for premium'
		],
		sections: [
			{
				eyebrow: 'Local-first, not local-limited',
				heading: 'Keep writing when the connection disappears',
				paragraphs: [
					'After the app is installed or loaded once, its writing interface remains available without a network connection. Projects, chapters, notes, settings, and imported artwork are stored in IndexedDB, the browser database intended for substantial offline data.',
					'The result feels like a desktop writing tool while remaining available from a modern browser. There is no save-folder setup and no technical database interface for the writer to understand.'
				],
				points: [
					{
						title: 'Automatic local saving',
						text: 'Edits are persisted behind the interface instead of adding save logic to every screen.'
					},
					{
						title: 'Offline application shell',
						text: 'The editor and its required assets are cached for continued writing.'
					},
					{
						title: 'No free-user manuscript traffic',
						text: 'Anonymous drafting does not call the PocketBase manuscript API.'
					}
				]
			},
			{
				eyebrow: 'Your choice',
				heading: 'Cloud storage begins with an explicit decision',
				paragraphs: [
					'Premium writers can register with email and password, then deliberately move their local library to cloud-backed storage. PocketBase becomes authoritative only after that migration is confirmed.',
					'A complete local cache remains on the device for offline work. When connectivity returns, queued changes synchronize without making the offline editor feel like a second-class mode.'
				]
			},
			{
				eyebrow: 'Practical privacy',
				heading: 'A private offline novel editor with understandable boundaries',
				paragraphs: [
					'“Local” has a concrete meaning here: a free manuscript remains in that browser profile unless you export it or choose premium migration. Clearing browser storage can remove local work, so regular PDF or EPUB exports are sensible backups.',
					'That honest boundary gives writers control without pretending a browser can protect data that the device owner deletes. The interface explains where work is stored instead of hiding the distinction.'
				]
			}
		],
		faq: [
			{
				question: 'Can I write with airplane mode enabled?',
				answer:
					'Yes, once the application has been loaded and its service worker installed on that device.'
			},
			{
				question: 'Do free manuscripts get uploaded?',
				answer:
					'No. The free path stores manuscript data locally and does not use the backend manuscript API.'
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
					'These categories are visible in the manuscript sidebar beneath the chapters. A writer does not need to understand folders, databases, tags, or schemas before capturing an important detail.'
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
		title: 'Book Typesetting Software with PDF and EPUB Export | WriteANovel',
		description:
			'Turn a novel draft into a readable book with WYSIWYG typesetting, trim and typography presets, artwork, covers, PDF, and EPUB export.',
		eyebrow: 'Draft to designed book',
		heading: 'WYSIWYG book typesetting software for novelists',
		introduction:
			'WriteANovel treats formatting as part of a clear publishing workflow. Writers can compose visually, choose sensible book presets, add pages and artwork, then print, save as PDF, or download EPUB from the same project.',
		highlights: [
			'6 × 9 inch and A5 trim presets',
			'Libre Baskerville book typography',
			'Raster image and SVG placement',
			'Matching print/PDF layout and EPUB 3 downloads'
		],
		sections: [
			{
				eyebrow: 'Readable by default',
				heading: 'Typesetting choices begin with useful presets',
				paragraphs: [
					'The default 6 × 9 inch trim and Libre Baskerville typography give a novel an intentional starting point. Additional trim and type presets let a writer change the feel without learning CSS, LaTeX, or professional layout terminology.',
					'Headings, paragraphs, quotations, emphasis, lists, and alignment remain visible in the WYSIWYG editor. The goal is the typographic care associated with typesetting systems, presented through controls a nontechnical writer can use.'
				],
				points: [
					{
						title: 'Trim presets',
						text: 'Choose a practical finished-page size without entering measurements.'
					},
					{
						title: 'Typography presets',
						text: 'Apply a coordinated reading style instead of formatting every paragraph.'
					},
					{
						title: 'Book metadata',
						text: 'Keep title, subtitle, author, language, and identifier details with the project.'
					}
				]
			},
			{
				eyebrow: 'Illustrated when the story needs it',
				heading: 'Place and resize images or vector artwork visually',
				paragraphs: [
					'Upload common raster formats for photographs and illustrations or use SVG files for maps, ornaments, and other vector artwork. Select an image in the editor to align it and drag its handles to the right size.',
					'Front and back covers are chosen separately from inline artwork. That distinction makes the book setup obvious and preserves the correct role for each asset during export.'
				]
			},
			{
				eyebrow: 'Files you can take elsewhere',
				heading: 'Save fixed pages as PDF and download EPUB for reflowable reading',
				paragraphs: [
					'The browser print flow uses the same layout engine as the writing preview. Choose Save as PDF in the print dialog for proofreading, sharing a fixed layout, or preparing a print-oriented copy.',
					'EPUB 3 export packages the reading order, chapters, book pages, covers, and media for e-readers and downstream publishing tools. Both formats leave the browser as ordinary files the writer controls.'
				]
			}
		],
		faq: [
			{
				question: 'How do I save the book as a PDF?',
				answer:
					'Choose Print / PDF, then select Save as PDF in the browser print dialog. This keeps the saved PDF aligned with the book preview and works while the app is offline.'
			},
			{
				question: 'Can I use SVG artwork as well as normal images?',
				answer:
					'Yes. Raster images and SVG artwork can be uploaded, positioned, and resized without an in-app drawing tool.'
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
