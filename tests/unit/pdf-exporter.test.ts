import { describe, expect, it } from 'vitest';
import type { WorkspaceSnapshot } from '$lib/domain/types';
import { buildPdfDefinition } from '$lib/export/pdf-exporter';

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
	it('fully justifies book paragraphs even when legacy alignment metadata is present', async () => {
		const definition = await buildPdfDefinition(workspace());

		expect(textAlignment(definition.content, 'Default book paragraph.')).toBe('justify');
		expect(textAlignment(definition.content, 'Deliberately left aligned.')).toBe('justify');
	});
});
