import type { DocumentKind, ManuscriptDocument } from './types';

export const POSITION_STEP = 1_000;

export function sortDocuments(documents: ManuscriptDocument[]): ManuscriptDocument[] {
	return [...documents].sort(
		(left, right) => left.position - right.position || left.id.localeCompare(right.id)
	);
}

export function documentsOfKind(
	documents: ManuscriptDocument[],
	kind: DocumentKind
): ManuscriptDocument[] {
	return sortDocuments(documents.filter((document) => document.kind === kind));
}

export function nextPosition(
	documents: ManuscriptDocument[],
	kind: DocumentKind,
	afterId?: string
): number {
	const section = documentsOfKind(documents, kind);
	if (section.length === 0) return POSITION_STEP;
	if (!afterId) return section.at(-1)!.position + POSITION_STEP;

	const currentIndex = section.findIndex((document) => document.id === afterId);
	if (currentIndex < 0 || currentIndex === section.length - 1) {
		return section.at(-1)!.position + POSITION_STEP;
	}

	const current = section[currentIndex].position;
	const following = section[currentIndex + 1].position;
	return current + (following - current) / 2;
}

export function normalizeDocumentPositions(
	documents: ManuscriptDocument[],
	kind: DocumentKind,
	now = new Date().toISOString()
): ManuscriptDocument[] {
	const section = documentsOfKind(documents, kind);
	const positions = new Map(
		section.map((document, index) => [document.id, (index + 1) * POSITION_STEP])
	);

	return documents.map((document) => {
		const position = positions.get(document.id);
		return position === undefined || position === document.position
			? document
			: { ...document, position, updatedAt: now };
	});
}

export function moveDocument(
	documents: ManuscriptDocument[],
	documentId: string,
	direction: -1 | 1,
	now = new Date().toISOString()
): ManuscriptDocument[] {
	const target = documents.find((document) => document.id === documentId);
	if (!target) return documents;

	const section = documentsOfKind(documents, target.kind);
	const from = section.findIndex((document) => document.id === documentId);
	const to = from + direction;
	if (from < 0 || to < 0 || to >= section.length) return documents;

	[section[from], section[to]] = [section[to], section[from]];
	const positions = new Map(
		section.map((document, index) => [document.id, (index + 1) * POSITION_STEP])
	);

	return documents.map((document) => {
		const position = positions.get(document.id);
		return position === undefined || position === document.position
			? document
			: { ...document, position, updatedAt: now };
	});
}

export function chapterNumber(
	documents: ManuscriptDocument[],
	documentId: string
): number | undefined {
	const index = documentsOfKind(documents, 'chapter').findIndex(
		(document) => document.id === documentId
	);
	return index < 0 ? undefined : index + 1;
}
