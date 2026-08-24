import type { TrimSize } from '$lib/domain/types';
import { BOOK_PAGE_METRICS, bookTypographyStyle } from '$lib/typesetting/book-style';
import type { TypographyPreset } from '$lib/domain/types';

export type EditorPageLayout = {
	pageHeight: number;
	pageGap: number;
	pageMarginInline: number;
	pageMarginBlock: number;
};

export function calculateEditorPageLayout(trimSize: TrimSize, pageWidth: number): EditorPageLayout {
	const page = BOOK_PAGE_METRICS[trimSize];
	const pageHeight = pageWidth * (page.height / page.width);
	return {
		pageHeight,
		pageGap: pageWidth < 480 ? 18 : 32,
		pageMarginInline: pageWidth * (page.marginInline / page.width),
		pageMarginBlock: pageHeight * (page.marginBlock / page.height)
	};
}

export function editorBodyFontSizePx(
	trimSize: TrimSize,
	typography: TypographyPreset,
	pageWidth: number
): number {
	const page = BOOK_PAGE_METRICS[trimSize];
	return bookTypographyStyle(typography).bodyFontSizePt * (pageWidth / page.width);
}
