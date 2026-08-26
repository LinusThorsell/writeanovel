import { extractTextItems, type StructuredTextItem } from 'unpdf';
import type { WorkspaceSnapshot } from '$lib/domain/types';
import { buildPdfBlob } from './pdf-exporter';
import { safeFileName } from './download';

export type PdfTextLocation = {
	page: number;
	pageTop?: number;
	searchText: string;
	matched: boolean;
};

export type PdfPreview = PdfTextLocation & {
	blob: Blob;
	fileName: string;
	totalPages: number;
};

function normalizedWords(value: string): string[] {
	return value
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLocaleLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, ' ')
		.trim()
		.split(/\s+/)
		.filter(Boolean);
}

function normalizedText(value: string): string {
	return normalizedWords(value).join(' ');
}

function pageText(items: StructuredTextItem[]): string {
	return items
		.map((item) => normalizedText(item.str))
		.filter(Boolean)
		.join(' ');
}

function itemAtTextOffset(
	items: StructuredTextItem[],
	textOffset: number
): StructuredTextItem | undefined {
	let offset = 0;
	for (const item of items) {
		const text = normalizedText(item.str);
		if (!text) continue;
		if (textOffset <= offset + text.length) return item;
		offset += text.length + 1;
	}
	return undefined;
}

function matchingPhrases(value: string): string[] {
	const words = normalizedWords(value);
	if (words.length === 0) return [];
	const phrases: string[] = [];
	const maximumPhraseLength = Math.min(12, words.length);

	for (let length = maximumPhraseLength; length >= Math.min(3, maximumPhraseLength); length -= 1) {
		for (let start = 0; start + length <= words.length; start += 1) {
			phrases.push(words.slice(start, start + length).join(' '));
		}
	}
	return phrases;
}

export function locatePdfText(
	pages: StructuredTextItem[][],
	anchorText: string,
	fallbackText = ''
): PdfTextLocation {
	const normalizedPages = pages.map(pageText);
	for (const candidate of [anchorText, fallbackText]) {
		for (const phrase of matchingPhrases(candidate)) {
			for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
				const textOffset = normalizedPages[pageIndex].indexOf(phrase);
				if (textOffset === -1) continue;
				const item = itemAtTextOffset(pages[pageIndex], textOffset);
				return {
					page: pageIndex + 1,
					pageTop: item ? item.y + item.height : undefined,
					searchText: phrase,
					matched: candidate === anchorText && Boolean(anchorText.trim())
				};
			}
		}
	}

	return { page: 1, searchText: '', matched: false };
}

export async function createPdfPreview(
	workspace: WorkspaceSnapshot,
	anchorText: string,
	fallbackText = ''
): Promise<PdfPreview> {
	const blob = await buildPdfBlob(workspace);
	const bytes = new Uint8Array(await blob.arrayBuffer());
	const extracted = await extractTextItems(bytes);
	return {
		blob,
		fileName: `${safeFileName(workspace.project.title)}.pdf`,
		totalPages: extracted.totalPages,
		...locatePdfText(extracted.items, anchorText, fallbackText)
	};
}
