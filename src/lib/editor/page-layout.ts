import type { TrimSize } from '$lib/domain/types';
import { BOOK_PAGE_METRICS } from '$lib/typesetting/book-style';

export type EditorPageLayout = {
	pageHeight: number;
	pageGap: number;
	pageMarginInline: number;
	pageMarginBlock: number;
};

export function calculateEditorPageLayout(trimSize: TrimSize, pageWidth: number): EditorPageLayout {
	const page = BOOK_PAGE_METRICS[trimSize];
	const pageHeight = Math.round(pageWidth * (page.height / page.width));
	return {
		pageHeight,
		pageGap: pageWidth < 480 ? 18 : 32,
		pageMarginInline: Math.round(
			Math.min(88, Math.max(22, pageWidth * (page.marginInline / page.width)))
		),
		pageMarginBlock: Math.round(
			Math.min(88, Math.max(44, pageHeight * (page.marginBlock / page.height)))
		)
	};
}
