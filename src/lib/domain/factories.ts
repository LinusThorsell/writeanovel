import type {
	DocumentKind,
	ManuscriptDocument,
	MatterType,
	NovelProject,
	NoteKind,
	StoryNote
} from './types';
import { EMPTY_DOCUMENT } from './types';
import { DEFAULT_CHAPTER_HEADING } from './chapter-headings';

const now = () => new Date().toISOString();

export function createNovelProject(input: Pick<NovelProject, 'title' | 'author'>): NovelProject {
	const timestamp = now();
	return {
		id: crypto.randomUUID(),
		title: input.title.trim() || 'Untitled novel',
		subtitle: '',
		author: input.author.trim(),
		synopsis: '',
		trimSize: 'trade-6x9',
		typography: 'literary',
		frontCoverPosition: 'center',
		backCoverPosition: 'center',
		chapterHeading: { ...DEFAULT_CHAPTER_HEADING },
		createdAt: timestamp,
		updatedAt: timestamp
	};
}

export function createManuscriptDocument(input: {
	projectId: string;
	kind: DocumentKind;
	title: string;
	position: number;
	matterType?: MatterType;
}): ManuscriptDocument {
	const timestamp = now();
	return {
		id: crypto.randomUUID(),
		projectId: input.projectId,
		kind: input.kind,
		matterType: input.matterType,
		title: input.title,
		position: input.position,
		body: structuredClone(EMPTY_DOCUMENT),
		comments: [],
		createdAt: timestamp,
		updatedAt: timestamp
	};
}

export function createStoryNote(input: {
	projectId: string;
	kind: NoteKind;
	title: string;
}): StoryNote {
	const timestamp = now();
	return {
		id: crypto.randomUUID(),
		projectId: input.projectId,
		kind: input.kind,
		title: input.title,
		summary: '',
		body: structuredClone(EMPTY_DOCUMENT),
		comments: [],
		createdAt: timestamp,
		updatedAt: timestamp
	};
}
