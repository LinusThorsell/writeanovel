import { chapterNumber, manuscriptDocuments } from './ordering';
import type {
	ManuscriptDocument,
	NovelProject,
	PageNumberingSettings,
	PageNumberPlacement
} from './types';

const DEFAULT_PAGE_NUMBERING = {
	enabled: true,
	countMode: 'restart',
	restartAt: 1,
	numeralStyle: 'arabic',
	template: 'Page {number}',
	placement: 'bottom-outside'
} as const;

export function bookPageNumbering(
	project: NovelProject,
	documents: ManuscriptDocument[]
): PageNumberingSettings | undefined {
	const ordered = manuscriptDocuments(documents);
	const first = ordered[0];
	const last = ordered.at(-1);
	if (!first || !last) return undefined;

	const saved = project.pageNumbering;
	let startIndex = saved
		? ordered.findIndex((document) => document.id === saved.startDocumentId)
		: -1;
	let endIndex = saved ? ordered.findIndex((document) => document.id === saved.endDocumentId) : -1;
	startIndex = startIndex >= 0 ? startIndex : 0;
	endIndex = endIndex >= 0 ? endIndex : ordered.length - 1;
	if (endIndex < startIndex) [startIndex, endIndex] = [endIndex, startIndex];

	return {
		...DEFAULT_PAGE_NUMBERING,
		...saved,
		startDocumentId: ordered[startIndex].id,
		endDocumentId: ordered[endIndex].id,
		restartAt: Math.max(1, Math.trunc(saved?.restartAt ?? DEFAULT_PAGE_NUMBERING.restartAt))
	};
}

export function numberedDocumentIds(
	settings: PageNumberingSettings,
	documents: ManuscriptDocument[]
): Set<string> {
	const ordered = manuscriptDocuments(documents);
	const startIndex = ordered.findIndex((document) => document.id === settings.startDocumentId);
	const endIndex = ordered.findIndex((document) => document.id === settings.endDocumentId);
	if (!settings.enabled || startIndex < 0 || endIndex < startIndex) return new Set();
	return new Set(ordered.slice(startIndex, endIndex + 1).map((document) => document.id));
}

export function pageNumberDocumentLabel(
	documents: ManuscriptDocument[],
	document: ManuscriptDocument
): string {
	if (document.kind === 'chapter') {
		return `Chapter ${chapterNumber(documents, document.id) ?? ''} — ${document.title}`;
	}
	return `${document.kind === 'front-matter' ? 'Front page' : 'Back page'} — ${document.title}`;
}

export function displayedPageNumber(
	settings: PageNumberingSettings,
	physicalPage: number,
	firstNumberedPhysicalPage: number,
	frontCoverPageCount: number
): number {
	return settings.countMode === 'restart'
		? settings.restartAt + physicalPage - firstNumberedPhysicalPage
		: physicalPage - frontCoverPageCount;
}

export function formatPageNumber(
	number: number,
	style: PageNumberingSettings['numeralStyle']
): string {
	if (style === 'arabic') return String(number);
	if (number <= 0 || number >= 4_000) return String(number);

	const numerals: ReadonlyArray<readonly [number, string]> = [
		[1_000, 'm'],
		[900, 'cm'],
		[500, 'd'],
		[400, 'cd'],
		[100, 'c'],
		[90, 'xc'],
		[50, 'l'],
		[40, 'xl'],
		[10, 'x'],
		[9, 'ix'],
		[5, 'v'],
		[4, 'iv'],
		[1, 'i']
	];
	let remainder = number;
	let result = '';
	for (const [value, numeral] of numerals) {
		while (remainder >= value) {
			result += numeral;
			remainder -= value;
		}
	}
	return result;
}

export function pageNumberText(settings: PageNumberingSettings, number: number): string {
	return settings.template.replaceAll('{number}', formatPageNumber(number, settings.numeralStyle));
}

export function pageNumberAlignment(
	placement: PageNumberPlacement,
	manuscriptPage: number
): 'left' | 'center' | 'right' {
	switch (placement) {
		case 'bottom-left':
			return 'left';
		case 'bottom-center':
			return 'center';
		case 'bottom-right':
			return 'right';
		case 'bottom-inside':
			return manuscriptPage % 2 === 0 ? 'right' : 'left';
		case 'bottom-outside':
			return manuscriptPage % 2 === 0 ? 'left' : 'right';
	}
}
