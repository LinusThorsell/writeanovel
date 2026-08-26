import { describe, expect, it } from 'vitest';
import type { StructuredTextItem } from 'unpdf';
import { locatePdfText } from '$lib/export/pdf-preview';

function item(str: string, y: number): StructuredTextItem {
	return {
		str,
		x: 50,
		y,
		width: 120,
		height: 12,
		fontSize: 10,
		fontFamily: 'Literary',
		dir: 'ltr',
		hasEOL: true
	};
}

describe('PDF preview location', () => {
	it('finds the page and vertical position containing the visible editor text', () => {
		const pages = [
			[item('The beginning of the voyage.', 500)],
			[
				item('Mara unfolded the silver chart beside the window.', 420),
				item('A unique compass marker pointed north.', 395)
			]
		];

		expect(locatePdfText(pages, 'the silver chart beside the window A unique compass')).toEqual({
			page: 2,
			pageTop: 432,
			searchText: 'the silver chart beside the window a unique compass',
			matched: true
		});
	});

	it('uses the active document title when its visible text is not exported', () => {
		const pages = [[item('Chapter 1 The Harbor', 500)], [item('Chapter 2 The Crossing', 500)]];

		expect(locatePdfText(pages, 'private character note', 'The Crossing')).toMatchObject({
			page: 2,
			searchText: 'the crossing',
			matched: false
		});
	});
});
