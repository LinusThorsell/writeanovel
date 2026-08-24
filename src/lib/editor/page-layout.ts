import type { TrimSize } from '$lib/domain/types';

export type EditorPageLayout = {
	pageHeight: number;
	pageGap: number;
	pageMarginBlock: number;
};

const PAGE_ASPECT_RATIOS: Record<TrimSize, number> = {
	'trade-6x9': 9 / 6,
	a5: 210 / 148,
	letter: 11 / 8.5
};

export function calculateEditorPageLayout(trimSize: TrimSize, pageWidth: number): EditorPageLayout {
	const pageHeight = Math.round(pageWidth * PAGE_ASPECT_RATIOS[trimSize]);
	return {
		pageHeight,
		pageGap: pageWidth < 480 ? 18 : 32,
		pageMarginBlock: Math.round(Math.min(88, Math.max(44, pageHeight * 0.08)))
	};
}
