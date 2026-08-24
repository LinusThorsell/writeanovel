import { describe, expect, it } from 'vitest';
import { editorContentWidthPx } from '$lib/typesetting/book-style';
import { printableImageWidth } from './print-layout';

describe('browser print layout', () => {
	it('preserves resized artwork as a percentage of the manuscript width', () => {
		const editorWidth = editorContentWidthPx('trade-6x9');
		expect(printableImageWidth(editorWidth / 2, 'trade-6x9')).toBe('50.0000%');
		expect(printableImageWidth(editorWidth * 2, 'trade-6x9')).toBe('100.0000%');
	});
});
