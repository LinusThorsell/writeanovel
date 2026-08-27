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

export type DrawingPoint = [x: number, y: number, pressure: number];

type DrawingElementBase = {
	id: string;
	strokeWidth: number;
};

type DrawingElementStyle = DrawingElementBase & {
	stroke: string;
};

export type FreehandDrawingElement = DrawingElementStyle & {
	type: 'freehand';
	points: DrawingPoint[];
};

export type LineDrawingElement = DrawingElementStyle & {
	type: 'line';
	x1: number;
	y1: number;
	x2: number;
	y2: number;
};

export type RectangleDrawingElement = DrawingElementStyle & {
	type: 'rectangle';
	x: number;
	y: number;
	width: number;
	height: number;
};

export type EllipseDrawingElement = DrawingElementStyle & {
	type: 'ellipse';
	cx: number;
	cy: number;
	rx: number;
	ry: number;
};

export type TextDrawingElement = DrawingElementStyle & {
	type: 'text';
	x: number;
	y: number;
	text: string;
	fontSize: number;
};

export type EraserDrawingElement = DrawingElementBase & {
	type: 'eraser';
	points: DrawingPoint[];
};

export type DrawingElement =
	| FreehandDrawingElement
	| LineDrawingElement
	| RectangleDrawingElement
	| EllipseDrawingElement
	| TextDrawingElement
	| EraserDrawingElement;

export type DrawingDocument = {
	version: 1;
	width: number;
	height: number;
	background: string;
	elements: DrawingElement[];
};

export type CommentMessage = {
	id: string;
	authorName: string;
	body: string;
	createdAt: string;
};

export type CommentThread = {
	id: string;
	quotedText: string;
	messages: CommentMessage[];
	createdAt: string;
	updatedAt: string;
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
export type CoverPosition =
	| 'top-left'
	| 'top-center'
	| 'top-right'
	| 'center-left'
	| 'center'
	| 'center-right'
	| 'bottom-left'
	| 'bottom-center'
	| 'bottom-right';
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
	frontCoverPosition?: CoverPosition;
	backCoverPosition?: CoverPosition;
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
	comments?: CommentThread[];
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
	comments?: CommentThread[];
	createdAt: string;
	updatedAt: string;
};

export type MediaAsset = {
	id: string;
	projectId: string;
	name: string;
	mimeType: string;
	bytes: Blob;
	drawing?: DrawingDocument;
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
