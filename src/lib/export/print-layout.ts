import type { TrimSize } from '$lib/domain/types';
import { editorContentWidthPx } from '$lib/typesetting/book-style';

export function printableImageWidth(width: number, trimSize: TrimSize): string {
	const percentage = Math.min(100, Math.max(1, (width / editorContentWidthPx(trimSize)) * 100));
	return `${percentage.toFixed(4)}%`;
}
