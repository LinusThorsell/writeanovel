export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];

export type JsonObject = {
	[key: string]: JsonValue;
};

export type RichTextMark = {
	type: string;
	attrs?: JsonObject;
};

export type RichTextNode = {
	type?: string;
	attrs?: JsonObject;
	content?: RichTextNode[];
	marks?: RichTextMark[];
	text?: string;
};

export type DocumentKind = 'chapter' | 'front-matter' | 'back-matter';
export type MatterType =
	| 'title-page'
	| 'copyright'
	| 'dedication'
	| 'epigraph'
	| 'preface'
	| 'acknowledgements'
	| 'about-author'
	| 'custom';
export type NoteKind = 'character' | 'environment' | 'plotline' | 'planning';
export type TrimSize = 'trade-6x9' | 'a5' | 'letter';
export type TypographyPreset = 'literary' | 'classic' | 'modern';
export type PageNumberCountMode = 'restart' | 'continue';
export type PageNumberNumeralStyle = 'arabic' | 'roman';
export type PageNumberPlacement =
	'bottom-left' | 'bottom-center' | 'bottom-right' | 'bottom-inside' | 'bottom-outside';
export type LibraryEntityType = 'project' | 'document' | 'note' | 'asset';

export type ChapterHeadingSettings = {
	showLabel: boolean;
	labelTemplate: string;
	showTitle: boolean;
};

export type PageNumberingSettings = {
	enabled: boolean;
	startDocumentId: string;
	endDocumentId: string;
	countMode: PageNumberCountMode;
	restartAt: number;
	numeralStyle: PageNumberNumeralStyle;
	template: string;
	placement: PageNumberPlacement;
};

export type NovelProject = {
	id: string;
	title: string;
	subtitle: string;
	author: string;
	synopsis: string;
	trimSize: TrimSize;
	typography: TypographyPreset;
	chapterHeading?: ChapterHeadingSettings;
	pageNumbering?: PageNumberingSettings;
	frontCoverAssetId?: string;
	backCoverAssetId?: string;
	createdAt: string;
	updatedAt: string;
};

export type ManuscriptDocument = {
	id: string;
	projectId: string;
	kind: DocumentKind;
	matterType?: MatterType;
	title: string;
	position: number;
	body: RichTextNode;
	chapterHeadingOverride?: ChapterHeadingSettings;
	createdAt: string;
	updatedAt: string;
};

export type StoryNote = {
	id: string;
	projectId: string;
	kind: NoteKind;
	title: string;
	summary: string;
	body: RichTextNode;
	createdAt: string;
	updatedAt: string;
};

export type MediaAsset = {
	id: string;
	projectId: string;
	name: string;
	mimeType: string;
	bytes: Blob;
	createdAt: string;
	updatedAt: string;
};

export type WorkspaceSnapshot = {
	project: NovelProject;
	documents: ManuscriptDocument[];
	notes: StoryNote[];
	assets: MediaAsset[];
};

export type AppPreferences = {
	id: 'current';
	activeProjectId?: string;
	activeItemId?: string;
};

export type PendingChange = {
	id: string;
	entityType: LibraryEntityType;
	entityId: string;
	projectId: string;
	operation: 'upsert' | 'delete';
	enqueuedAt: string;
};

export type AuthenticatedUser = {
	id: string;
	email: string;
	displayName: string;
	isPremium: boolean;
};

export type SyncStatus = 'local' | 'offline' | 'syncing' | 'synced' | 'error';

export const EMPTY_DOCUMENT: RichTextNode = {
	type: 'doc',
	content: [{ type: 'paragraph' }]
};
