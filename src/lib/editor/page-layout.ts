import type { TrimSize } from '$lib/domain/types';
import { BOOK_PAGE_METRICS } from '$lib/typesetting/book-style';

export type EditorPageLayout = {
	pageHeight: number;
	pageMarginInline: number;
	pageMarginBlock: number;
	compact: boolean;
};

export function calculateEditorPageLayout(
	trimSize: TrimSize,
	pageWidth: number,
	compact = false
): EditorPageLayout {
	const page = BOOK_PAGE_METRICS[trimSize];
	const pageHeight = Math.round(pageWidth * (page.height / page.width));
	if (compact) {
		return {
			pageHeight,
			pageMarginInline: Math.round(Math.min(24, Math.max(18, pageWidth * 0.055))),
			pageMarginBlock: Math.round(Math.min(36, Math.max(28, pageWidth * 0.08))),
			compact: true
		};
	}

	return {
		pageHeight,
		pageMarginInline: Math.round(
			Math.min(88, Math.max(22, pageWidth * (page.marginInline / page.width)))
		),
		pageMarginBlock: Math.round(
			Math.min(88, Math.max(44, pageHeight * (page.marginBlock / page.height)))
		),
		compact: false
	};
}
