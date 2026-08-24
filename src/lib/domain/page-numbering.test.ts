import { describe, expect, it } from 'vitest';
import type { ManuscriptDocument, NovelProject, PageNumberingSettings } from './types';
import {
	bookPageNumbering,
	displayedPageNumber,
	formatPageNumber,
	numberedDocumentIds,
	pageNumberAlignment,
	pageNumberText
} from './page-numbering';

const timestamp = '2026-01-01T00:00:00.000Z';

function document(
	id: string,
	kind: ManuscriptDocument['kind'],
	position: number
): ManuscriptDocument {
	return {
		id,
		projectId: 'book-1',
		kind,
		title: id,
		position,
		body: { type: 'doc', content: [{ type: 'paragraph' }] },
		createdAt: timestamp,
		updatedAt: timestamp
	};
}

function project(pageNumbering?: PageNumberingSettings): NovelProject {
	return {
		id: 'book-1',
		title: 'Test book',
		subtitle: '',
		author: 'Writer',
		synopsis: '',
		trimSize: 'trade-6x9',
		typography: 'literary',
		...(pageNumbering ? { pageNumbering } : {}),
		createdAt: timestamp,
		updatedAt: timestamp
	};
}

const documents = [
	document('chapter-2', 'chapter', 2_000),
	document('back', 'back-matter', 1_000),
	document('front', 'front-matter', 1_000),
	document('chapter-1', 'chapter', 1_000)
];

const settings: PageNumberingSettings = {
	enabled: true,
	startDocumentId: 'chapter-1',
	endDocumentId: 'chapter-2',
	countMode: 'restart',
	restartAt: 7,
	numeralStyle: 'roman',
	template: '— {number} —',
	placement: 'bottom-outside'
};

describe('page numbering', () => {
	it('keeps a selected document range stable in manuscript order', () => {
		expect([...numberedDocumentIds(settings, documents)]).toEqual(['chapter-1', 'chapter-2']);
		expect(bookPageNumbering(project(settings), documents)).toEqual(settings);
	});

	it('keeps both selected endpoints when those files are reordered', () => {
		const reordered = documents.map((item) =>
			item.id === 'chapter-1'
				? { ...item, position: 3_000 }
				: item.id === 'chapter-2'
					? { ...item, position: 1_000 }
					: item
		);
		const restored = bookPageNumbering(project(settings), reordered);
		expect(restored?.startDocumentId).toBe('chapter-2');
		expect(restored?.endDocumentId).toBe('chapter-1');
		expect(restored && [...numberedDocumentIds(restored, reordered)]).toEqual([
			'chapter-2',
			'chapter-1'
		]);
	});

	it('falls back safely when a saved range endpoint was deleted', () => {
		const restored = bookPageNumbering(
			project({ ...settings, startDocumentId: 'deleted', endDocumentId: 'also-deleted' }),
			documents
		);
		expect(restored?.startDocumentId).toBe('front');
		expect(restored?.endDocumentId).toBe('back');
	});

	it('can restart at a chosen value or count earlier hidden manuscript pages', () => {
		expect(displayedPageNumber(settings, 5, 5, 1)).toBe(7);
		expect(displayedPageNumber(settings, 6, 5, 1)).toBe(8);
		expect(displayedPageNumber({ ...settings, countMode: 'continue' }, 5, 5, 1)).toBe(4);
	});

	it('formats Arabic and Roman values through the writer template', () => {
		expect(formatPageNumber(19, 'arabic')).toBe('19');
		expect(formatPageNumber(19, 'roman')).toBe('xix');
		expect(pageNumberText(settings, 8)).toBe('— viii —');
		expect(pageNumberText({ ...settings, template: 'Page {number}' }, 7)).toBe('Page vii');
	});

	it('places fixed and mirrored numbers on the expected side', () => {
		expect(pageNumberAlignment('bottom-left', 1)).toBe('left');
		expect(pageNumberAlignment('bottom-center', 1)).toBe('center');
		expect(pageNumberAlignment('bottom-right', 1)).toBe('right');
		expect(pageNumberAlignment('bottom-outside', 1)).toBe('right');
		expect(pageNumberAlignment('bottom-outside', 2)).toBe('left');
		expect(pageNumberAlignment('bottom-inside', 1)).toBe('left');
		expect(pageNumberAlignment('bottom-inside', 2)).toBe('right');
	});
});
