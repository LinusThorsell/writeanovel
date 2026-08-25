import { describe, expect, it } from 'vitest';
import { calculateEditorPageLayout } from '$lib/editor/page-layout';
import type { ManuscriptDocument, NovelProject } from '$lib/domain/types';
import { BOOK_PAGE_METRICS, bookTypographyStyle, typesetDocumentHeading } from './book-style';

function chapter(id: string, title: string, position: number): ManuscriptDocument {
	return {
		id,
		projectId: 'book-1',
		kind: 'chapter',
		title,
		position,
		body: { type: 'doc', content: [{ type: 'paragraph' }] },
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z'
	};
}

function project(): NovelProject {
	return {
		id: 'book-1',
		title: 'Test book',
		subtitle: '',
		author: 'Test writer',
		synopsis: '',
		trimSize: 'trade-6x9',
		typography: 'literary',
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z'
	};
}

describe('shared book typesetting', () => {
	it('keeps automatic chapter headings numbered from manuscript order', () => {
		const documents = [chapter('later', 'Chapter 1', 2_000), chapter('first', 'Chapter 7', 1_000)];

		expect(typesetDocumentHeading(project(), documents, documents[1])).toEqual({
			kind: 'chapter',
			title: 'Chapter 1'
		});
		expect(typesetDocumentHeading(project(), documents, documents[0])).toEqual({
			kind: 'chapter',
			title: 'Chapter 2'
		});
	});

	it('pairs a custom chapter title with its live automatic chapter number', () => {
		const documents = [chapter('opening', 'The Lantern Room', 1_000)];

		expect(typesetDocumentHeading(project(), documents, documents[0])).toEqual({
			kind: 'chapter',
			label: 'Chapter 1',
			title: 'The Lantern Room'
		});
	});

	it('applies book-wide label templates and complete per-chapter overrides', () => {
		const book = project();
		book.chapterHeading = {
			showLabel: true,
			labelTemplate: 'Scene {number}',
			showTitle: false
		};
		const documents = [chapter('opening', 'The Lantern Room', 1_000)];

		expect(typesetDocumentHeading(book, documents, documents[0])).toEqual({
			kind: 'chapter',
			label: 'Scene 1'
		});

		documents[0].chapterHeadingOverride = {
			showLabel: false,
			labelTemplate: 'Ignored {number}',
			showTitle: false
		};
		expect(typesetDocumentHeading(book, documents, documents[0])).toEqual({ kind: 'chapter' });
	});

	it('scales editor pages from the same dimensions and margins used by PDF export', () => {
		const pageWidth = 736;
		const pdfPage = BOOK_PAGE_METRICS['trade-6x9'];
		const editorPage = calculateEditorPageLayout('trade-6x9', pageWidth);

		expect(editorPage.pageHeight).toBe(Math.round(pageWidth * (pdfPage.height / pdfPage.width)));
		expect(editorPage.pageMarginInline).toBe(
			Math.round(pageWidth * (pdfPage.marginInline / pdfPage.width))
		);
		expect(editorPage.pageMarginBlock).toBe(
			Math.round(editorPage.pageHeight * (pdfPage.marginBlock / pdfPage.height))
		);
		expect(editorPage.compact).toBe(false);
	});

	it('uses compact readable gutters on phone-sized editor pages', () => {
		const editorPage = calculateEditorPageLayout('trade-6x9', 390, true);

		expect(editorPage.compact).toBe(true);
		expect(editorPage.pageMarginInline).toBeLessThanOrEqual(24);
		expect(editorPage.pageMarginBlock).toBeLessThanOrEqual(36);
		expect((390 - editorPage.pageMarginInline * 2) / 390).toBeGreaterThan(0.86);
	});

	it('gives every exported PDF a conventional centered text frame', () => {
		for (const page of Object.values(BOOK_PAGE_METRICS)) {
			const textFrameRatio = (page.width - page.marginInline * 2) / page.width;
			expect(textFrameRatio).toBeGreaterThan(0.74);
			expect(textFrameRatio).toBeLessThan(0.78);
		}
	});

	it('uses an embeddable PDF counterpart for every editor typography preset', () => {
		for (const preset of ['literary', 'classic', 'modern'] as const) {
			const style = bookTypographyStyle(preset);
			expect(style.editorFontFamily).toBeTruthy();
			expect(style.pdfFont).toMatch(/Literary|Manrope/);
			expect(style.bodyFontSizePt).toBeGreaterThan(9);
			expect(style.lineHeight).toBeGreaterThan(1.5);
		}
	});
});
