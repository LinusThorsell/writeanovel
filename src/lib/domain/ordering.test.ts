import { describe, expect, it } from 'vitest';
import type { ManuscriptDocument } from './types';
import { chapterNumber, moveDocument, nextPosition, sortDocuments } from './ordering';

function document(
	id: string,
	position: number,
	kind: ManuscriptDocument['kind'] = 'chapter'
): ManuscriptDocument {
	return {
		id,
		projectId: 'project-1',
		kind,
		title: id,
		position,
		body: { type: 'doc', content: [{ type: 'paragraph' }] },
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z'
	};
}

describe('manuscript ordering', () => {
	it('inserts between chapters without coupling display numbers to storage positions', () => {
		const documents = [document('one', 1_000), document('three', 3_000)];
		const position = nextPosition(documents, 'chapter', 'one');
		const withInserted = [...documents, document('two', position)];

		expect(position).toBe(2_000);
		expect(sortDocuments(withInserted).map((item) => item.id)).toEqual(['one', 'two', 'three']);
		expect(chapterNumber(withInserted, 'two')).toBe(2);
	});

	it('renumbers chapters when they move while leaving book pages out of the count', () => {
		const documents = [
			document('copyright', 1_000, 'front-matter'),
			document('first', 1_000),
			document('second', 2_000),
			document('third', 3_000)
		];
		const moved = moveDocument(documents, 'third', -1, '2026-02-01T00:00:00.000Z');

		expect(chapterNumber(moved, 'third')).toBe(2);
		expect(chapterNumber(moved, 'second')).toBe(3);
		expect(moved.find((item) => item.id === 'copyright')?.position).toBe(1_000);
	});
});
