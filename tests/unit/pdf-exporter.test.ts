import { describe, expect, it } from 'vitest';
import type { ContentImage, ContentSection, ContentSvg } from 'pdfmake/interfaces';
import type { WorkspaceSnapshot } from '$lib/domain/types';
import { buildPdfDefinition } from '$lib/export/pdf-exporter';
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
					content: [
						{
							type: 'paragraph',
							content: [{ type: 'text', text: 'Default book paragraph.' }]
						},
						{
							type: 'paragraph',
							attrs: { textAlign: 'left' },
							content: [{ type: 'text', text: 'Deliberately left aligned.' }]
						}
					]
				},
				createdAt: '2026-01-01T00:00:00.000Z',
				updatedAt: '2026-01-01T00:00:00.000Z'
			}
		],
		notes: [],
		assets: []
	};
}

function textAlignment(value: unknown, text: string): string | undefined {
	if (Array.isArray(value)) {
		for (const item of value) {
			const alignment = textAlignment(item, text);
			if (alignment) return alignment;
		}
		return undefined;
	}
	if (!value || typeof value !== 'object') return undefined;

	const record = value as Record<string, unknown>;
	if (
		Array.isArray(record.text) &&
		record.text.some(
			(item) => item && typeof item === 'object' && (item as Record<string, unknown>).text === text
		)
	) {
		return typeof record.alignment === 'string' ? record.alignment : undefined;
	}

	for (const child of Object.values(record)) {
		const alignment = textAlignment(child, text);
		if (alignment) return alignment;
	}
	return undefined;
}

describe('PDF export', () => {
	it('renders editable drawings from their generated SVG asset', async () => {
		const snapshot = workspace();
		const drawingDocument = createEmptyDrawing();
		drawingDocument.elements.push({
			id: 'square-1',
			type: 'rectangle',
			stroke: '#243d33',
			strokeWidth: 12,
			x: 200,
			y: 200,
			width: 400,
			height: 400
		});
		const drawing = createDrawingAsset(snapshot.project.id, drawingDocument);
		drawing.id = 'drawing-1';
		snapshot.assets = [drawing];
		snapshot.documents[0].body.content?.push({
			type: 'drawing',
			attrs: { assetId: drawing.id, alignment: 'right', width: 360 }
		});

		const definition = await buildPdfDefinition(snapshot);
		const serialized = JSON.stringify(definition.content);
		expect(serialized).toContain('<rect x=\\"200\\" y=\\"200\\" width=\\"400\\" height=\\"400\\"');
		expect(serialized).toContain('"alignment":"right"');
	});

	it('fully justifies book paragraphs even when legacy alignment metadata is present', async () => {
		const definition = await buildPdfDefinition(workspace());

		expect(textAlignment(definition.content, 'Default book paragraph.')).toBe('justify');
		expect(textAlignment(definition.content, 'Deliberately left aligned.')).toBe('justify');
	});

	it('makes raster covers full bleed and applies their crop positions', async () => {
		const snapshot = workspace();
		snapshot.project.frontCoverAssetId = 'front-cover';
		snapshot.project.frontCoverPosition = 'top-left';
		snapshot.project.backCoverAssetId = 'back-cover';
		snapshot.project.backCoverPosition = 'bottom-right';
		const pixel = new Blob(
			[
				Uint8Array.from(
					atob(
						'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nWQAAAAASUVORK5CYII='
					),
					(character) => character.charCodeAt(0)
				)
			],
			{ type: 'image/png' }
		);
		snapshot.assets = ['front-cover', 'back-cover'].map((id) => ({
			id,
			projectId: snapshot.project.id,
			name: `${id}.png`,
			mimeType: 'image/png',
			bytes: pixel,
			createdAt: snapshot.project.createdAt,
			updatedAt: snapshot.project.updatedAt
		}));

		const definition = await buildPdfDefinition(snapshot);
		const sections = definition.content as ContentSection[];
		const front = sections[0];
		const back = sections.at(-1)!;

		expect(front.pageMargins).toEqual([0, 0, 0, 0]);
		expect(back.pageMargins).toEqual([0, 0, 0, 0]);
		expect((front.section as ContentImage).cover).toEqual({
			width: 432,
			height: 648,
			align: 'left',
			valign: 'top'
		});
		expect((back.section as ContentImage).cover).toEqual({
			width: 432,
			height: 648,
			align: 'right',
			valign: 'bottom'
		});
	});

	it('uses aspect-ratio cropping for full-bleed SVG covers', async () => {
		const snapshot = workspace();
		snapshot.project.frontCoverAssetId = 'svg-cover';
		snapshot.project.frontCoverPosition = 'bottom-right';
		snapshot.assets = [
			{
				id: 'svg-cover',
				projectId: snapshot.project.id,
				name: 'cover.svg',
				mimeType: 'image/svg+xml',
				bytes: new Blob(
					[
						'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100"/></svg>'
					],
					{ type: 'image/svg+xml' }
				),
				createdAt: snapshot.project.createdAt,
				updatedAt: snapshot.project.updatedAt
			}
		];

		const definition = await buildPdfDefinition(snapshot);
		const front = (definition.content as ContentSection[])[0];
		const svg = front.section as ContentSvg;

		expect(front.pageMargins).toEqual([0, 0, 0, 0]);
		expect(svg.width).toBe(432);
		expect(svg.height).toBe(648);
		expect(svg.svg).toContain('preserveAspectRatio="xMaxYMax slice"');
		expect(svg.svg).toContain('overflow="hidden"');
	});
});
