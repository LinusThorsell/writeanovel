import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { buildEpub } from './epub-exporter';
import type { WorkspaceSnapshot } from '$lib/domain/types';

function workspace(): WorkspaceSnapshot {
	return {
		project: {
			id: 'book-1',
			title: 'The Test Book',
			subtitle: '',
			author: 'Test Writer',
			synopsis: '',
			trimSize: 'trade-6x9',
			typography: 'literary',
			createdAt: '2026-01-01T00:00:00.000Z',
			updatedAt: '2026-01-01T00:00:00.000Z'
		},
		documents: [
			{
				id: 'chapter-1',
				projectId: 'book-1',
				kind: 'chapter',
				title: 'A Beginning',
				position: 1_000,
				body: {
					type: 'doc',
					content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Once upon a test.' }] }]
				},
				createdAt: '2026-01-01T00:00:00.000Z',
				updatedAt: '2026-01-01T00:00:00.000Z'
			}
		],
		notes: [],
		assets: []
	};
}

describe('EPUB export', () => {
	it('creates a valid EPUB container with navigation and manuscript XHTML', async () => {
		const archive = await JSZip.loadAsync(await buildEpub(workspace()));
		expect(await archive.file('mimetype')?.async('string')).toBe('application/epub+zip');
		expect(await archive.file('OEBPS/nav.xhtml')?.async('string')).toContain('A Beginning');
		expect(await archive.file('OEBPS/text/chapter-1.xhtml')?.async('string')).toContain(
			'Once upon a test.'
		);
		const chapter = await archive.file('OEBPS/text/chapter-1.xhtml')?.async('string');
		expect(chapter).toContain('<p class="chapter-label">Chapter 1</p>');
		expect(chapter).toContain('<h1>A Beginning</h1>');
		expect(await archive.file('OEBPS/content.opf')?.async('string')).toContain('The Test Book');
	});
});
