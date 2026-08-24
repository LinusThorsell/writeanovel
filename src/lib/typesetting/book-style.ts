import { chapterNumber } from '$lib/domain/ordering';
import { chapterLabel, documentChapterHeading } from '$lib/domain/chapter-headings';
import type {
	DocumentKind,
	ManuscriptDocument,
	NovelProject,
	TrimSize,
	TypographyPreset
} from '$lib/domain/types';

export type BookPageMetrics = {
	width: number;
	height: number;
	marginInline: number;
	marginBlock: number;
};

export type BookTypographyStyle = {
	editorFontFamily: string;
	bodyFontSizePt: number;
	lineHeight: number;
	documentTitleScale: number;
	documentLabelScale: number;
	headingOneScale: number;
	headingTwoScale: number;
	headingThreeScale: number;
};

export type TypesetDocumentHeading = {
	kind: DocumentKind;
	label?: string;
	title?: string;
};

export const BOOK_PAGE_METRICS: Record<TrimSize, BookPageMetrics> = {
	'trade-6x9': { width: 432, height: 648, marginInline: 50, marginBlock: 50 },
	a5: { width: 419.53, height: 595.28, marginInline: 50, marginBlock: 50 },
	letter: { width: 612, height: 792, marginInline: 72, marginBlock: 72 }
};

export const BOOK_LAYOUT = {
	documentHeadingTopRatio: 0.2,
	documentHeadingGapEm: 3,
	documentTitleLetterSpacingEm: 0.04,
	documentLabelLetterSpacingEm: 0.12,
	documentLabelGapEm: 0.85,
	paragraphGapEm: 0.2,
	paragraphIndentEm: 1.5,
	headingLineHeight: 1.25,
	headingMarginTopEm: 2.2,
	headingMarginBottomEm: 0.8,
	blockquoteMarginBlockEm: 1.5,
	blockquoteMarginInlineEm: 2,
	mediaMarginBlockEm: 1.5,
	maximumEditorPageWidthPx: 736
} as const;

const BOOK_TYPOGRAPHY: Record<TypographyPreset, BookTypographyStyle> = {
	literary: {
		editorFontFamily: "'Libre Baskerville', Georgia, serif",
		bodyFontSizePt: 10,
		lineHeight: 1.62,
		documentTitleScale: 1.8,
		documentLabelScale: 0.78,
		headingOneScale: 1.7,
		headingTwoScale: 1.35,
		headingThreeScale: 1.08
	},
	classic: {
		editorFontFamily: "'Libre Baskerville', Georgia, serif",
		bodyFontSizePt: 10.4,
		lineHeight: 1.58,
		documentTitleScale: 1.72,
		documentLabelScale: 0.76,
		headingOneScale: 1.65,
		headingTwoScale: 1.32,
		headingThreeScale: 1.07
	},
	modern: {
		editorFontFamily: "'Manrope Variable', sans-serif",
		bodyFontSizePt: 10.5,
		lineHeight: 1.56,
		documentTitleScale: 1.75,
		documentLabelScale: 0.76,
		headingOneScale: 1.68,
		headingTwoScale: 1.34,
		headingThreeScale: 1.08
	}
};

export function bookTypographyStyle(preset: TypographyPreset): BookTypographyStyle {
	return BOOK_TYPOGRAPHY[preset];
}

export function typesetDocumentHeading(
	project: NovelProject,
	documents: ManuscriptDocument[],
	document: ManuscriptDocument
): TypesetDocumentHeading {
	const cleanTitle = document.title.trim();
	if (document.kind !== 'chapter') {
		return {
			kind: document.kind,
			title: cleanTitle || 'Untitled page'
		};
	}

	const number = chapterNumber(documents, document.id);
	const settings = documentChapterHeading(project, document);
	const label = settings.showLabel ? chapterLabel(settings.labelTemplate, number) : '';
	const automaticTitle = number ? `Chapter ${number}` : 'Chapter';
	const title = /^chapter\s+\d+$/i.test(cleanTitle) ? automaticTitle : cleanTitle;
	const visibleTitle = settings.showTitle ? title || 'Untitled chapter' : '';
	const visibleLabel =
		label && label.toLocaleLowerCase() !== visibleTitle.toLocaleLowerCase() ? label : '';

	return {
		kind: document.kind,
		...(visibleLabel ? { label: visibleLabel } : {}),
		...(visibleTitle ? { title: visibleTitle } : {})
	};
}

export function editorContentWidthPx(trimSize: TrimSize): number {
	const page = BOOK_PAGE_METRICS[trimSize];
	return BOOK_LAYOUT.maximumEditorPageWidthPx * (1 - (page.marginInline * 2) / page.width);
}
