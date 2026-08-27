import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { buildEpub } from './epub-exporter';
import type { WorkspaceSnapshot } from '$lib/domain/types';
import { createDrawingAsset } from '$lib/application/media-service';
import { createEmptyDrawing } from '$lib/domain/drawing';

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
		expect(await archive.file('OEBPS/styles/book.css')?.async('string')).toContain(
			'text-align: justify'
		);
	});

	it('packages editable drawing previews as SVG artwork', async () => {
		const snapshot = workspace();
		const drawingDocument = createEmptyDrawing();
		drawingDocument.elements.push({
			id: 'circle-1',
			type: 'ellipse',
			stroke: '#243d33',
			strokeWidth: 10,
			cx: 512,
			cy: 512,
			rx: 200,
			ry: 200
		});
		const asset = createDrawingAsset(snapshot.project.id, drawingDocument);
		asset.id = 'drawing-1';
		snapshot.assets = [asset];
		snapshot.documents[0].body.content?.push({
			type: 'drawing',
			attrs: { assetId: asset.id, alt: 'A circular map', alignment: 'center', width: 420 }
		});

		const archive = await JSZip.loadAsync(await buildEpub(snapshot));
		const chapter = await archive.file('OEBPS/text/chapter-1.xhtml')?.async('string');
		const svg = await archive.file('OEBPS/images/drawing-1.svg')?.async('string');

		expect(chapter).toContain('../images/drawing-1.svg');
		expect(svg).toContain('<ellipse');
		expect(await archive.file('OEBPS/content.opf')?.async('string')).toContain(
			'media-type="image/svg+xml"'
		);
	});
});
