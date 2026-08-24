import type { AccountPort } from './ports';
import { LibraryService } from './library-service';
import { accountService, libraryService } from './services';
import {
	createManuscriptDocument,
	createNovelProject,
	createStoryNote
} from '$lib/domain/factories';
import { chapterNumber, documentsOfKind, moveDocument, nextPosition } from '$lib/domain/ordering';
import type {
	AuthenticatedUser,
	ChapterHeadingSettings,
	PageNumberingSettings,
	DocumentKind,
	ManuscriptDocument,
	MatterType,
	MediaAsset,
	NoteKind,
	NovelProject,
	RichTextNode,
	StoryNote,
	SyncStatus,
	TrimSize,
	TypographyPreset,
	WorkspaceSnapshot
} from '$lib/domain/types';
import { createAssetUrls, createMediaAsset, revokeAssetUrls } from './media-service';

export type MediaInsertion = {
	assetId: string;
	url: string;
	name: string;
};

export class WriteANovelState {
	projects = $state.raw<NovelProject[]>([]);
	workspace = $state.raw<WorkspaceSnapshot>();
	activeItemId = $state<string>();
	user = $state.raw<AuthenticatedUser>();
	syncStatus = $state<SyncStatus>('local');
	loading = $state(true);
	working = $state(false);
	exporting = $state<'pdf' | 'epub'>();
	accountOpen = $state(false);
	settingsOpen = $state(false);
	notice = $state<string>();
	error = $state<string>();
	assetUrls = $state.raw<Map<string, string>>(new Map());
	private noticeTimer: ReturnType<typeof setTimeout> | undefined;

	constructor(
		private readonly library: LibraryService = libraryService,
		private readonly accounts: AccountPort = accountService
	) {
		this.library.onSyncStatus((status) => {
			this.syncStatus = status;
		});
	}

	get activeDocument(): ManuscriptDocument | undefined {
		return this.workspace?.documents.find((document) => document.id === this.activeItemId);
	}

	get activeNote(): StoryNote | undefined {
		return this.workspace?.notes.find((note) => note.id === this.activeItemId);
	}

	get isPremium(): boolean {
		return this.user?.isPremium === true;
	}

	get chapterCount(): number {
		return this.workspace ? documentsOfKind(this.workspace.documents, 'chapter').length : 0;
	}

	async initialize(): Promise<void> {
		this.loading = true;
		this.user = this.accounts.currentUser();
		this.library.configureUser(this.user);

		if (this.user) {
			this.user = await this.accounts.refresh();
			this.library.configureUser(this.user);
		}

		if (this.isPremium && navigator.onLine) {
			await this.library.refreshFromCloud().catch(() => undefined);
		}

		this.projects = await this.library.listProjects();
		const preferences = await this.library.getPreferences();
		if (
			preferences.activeProjectId &&
			this.projects.some((project) => project.id === preferences.activeProjectId)
		) {
			await this.openProject(preferences.activeProjectId, preferences.activeItemId);
		} else if (preferences.activeProjectId) {
			await this.library.savePreferences({ id: 'current' });
		}
		this.loading = false;
	}

	async createProject(title: string, author: string): Promise<void> {
		const project = createNovelProject({ title, author });
		const firstDocument = createManuscriptDocument({
			projectId: project.id,
			kind: 'chapter',
			title: 'Chapter 1',
			position: 1_000
		});
		await this.library.createProject(project, firstDocument);
		this.projects = [project, ...this.projects];
		await this.openProject(project.id);
		this.showNotice('Your new novel is ready.');
	}

	async openProject(projectId: string, preferredItemId?: string): Promise<void> {
		const workspace = await this.library.getWorkspace(projectId);
		if (!workspace) return;
		this.replaceAssetUrls(workspace.assets);
		this.workspace = workspace;
		this.activeItemId = this.workspaceItemExists(workspace, preferredItemId)
			? preferredItemId
			: this.firstWorkspaceItemId(workspace);
		this.rememberWorkspace();
	}

	closeProject(): void {
		revokeAssetUrls(this.assetUrls);
		this.assetUrls = new Map();
		this.workspace = undefined;
		this.activeItemId = undefined;
		this.rememberWorkspace();
	}

	selectItem(itemId: string): void {
		this.activeItemId = itemId;
		this.rememberWorkspace();
	}

	async addChapter(afterId?: string): Promise<void> {
		if (!this.workspace) return;
		const count = this.chapterCount + 1;
		const document = createManuscriptDocument({
			projectId: this.workspace.project.id,
			kind: 'chapter',
			title: `Chapter ${count}`,
			position: nextPosition(this.workspace.documents, 'chapter', afterId)
		});
		await this.library.saveDocument(document);
		this.workspace = {
			...this.workspace,
			documents: [...this.workspace.documents, document]
		};
		this.activeItemId = document.id;
		this.rememberWorkspace();
	}

	async addMatter(kind: Exclude<DocumentKind, 'chapter'>, matterType: MatterType): Promise<void> {
		if (!this.workspace) return;
		const titles: Record<MatterType, string> = {
			'title-page': 'Title page',
			copyright: 'Copyright',
			dedication: 'Dedication',
			epigraph: 'Epigraph',
			preface: 'Preface',
			acknowledgements: 'Acknowledgements',
			'about-author': 'About the author',
			custom: 'New book page'
		};
		const document = createManuscriptDocument({
			projectId: this.workspace.project.id,
			kind,
			matterType,
			title: titles[matterType],
			position: nextPosition(this.workspace.documents, kind)
		});
		await this.library.saveDocument(document);
		this.workspace = {
			...this.workspace,
			documents: [...this.workspace.documents, document]
		};
		this.activeItemId = document.id;
		this.rememberWorkspace();
	}

	async moveActiveDocument(direction: -1 | 1): Promise<void> {
		if (!this.workspace || !this.activeDocument) return;
		const updated = moveDocument(this.workspace.documents, this.activeDocument.id, direction);
		const changed = updated.filter(
			(document, index) => document !== this.workspace!.documents[index]
		);
		await Promise.all(changed.map((document) => this.library.saveDocument(document)));
		this.workspace = { ...this.workspace, documents: updated };
	}

	async deleteActiveItem(): Promise<void> {
		if (this.activeDocument) {
			if (this.activeDocument.kind === 'chapter' && this.chapterCount === 1) {
				this.showError('A novel needs at least one chapter.');
				return;
			}
			await this.library.deleteDocument(this.activeDocument);
			this.removeItemFromWorkspace(this.activeDocument.id);
			return;
		}
		if (this.activeNote) {
			await this.library.deleteNote(this.activeNote);
			this.removeItemFromWorkspace(this.activeNote.id);
		}
	}

	async updateActiveTitle(title: string): Promise<void> {
		const cleanTitle = title.trim() || 'Untitled';
		const timestamp = new Date().toISOString();
		if (this.activeDocument && this.workspace) {
			const updated = { ...this.activeDocument, title: cleanTitle, updatedAt: timestamp };
			await this.library.saveDocument(updated);
			this.workspace = {
				...this.workspace,
				documents: this.workspace.documents.map((document) =>
					document.id === updated.id ? updated : document
				)
			};
		}
		if (this.activeNote && this.workspace) {
			const updated = { ...this.activeNote, title: cleanTitle, updatedAt: timestamp };
			await this.library.saveNote(updated);
			this.workspace = {
				...this.workspace,
				notes: this.workspace.notes.map((note) => (note.id === updated.id ? updated : note))
			};
		}
	}

	async updateDocumentBody(documentId: string, body: RichTextNode): Promise<void> {
		if (!this.workspace) return;
		const existing = this.workspace.documents.find((document) => document.id === documentId);
		if (!existing) return;
		const updated = { ...existing, body, updatedAt: new Date().toISOString() };
		this.workspace = {
			...this.workspace,
			documents: this.workspace.documents.map((document) =>
				document.id === documentId ? updated : document
			)
		};
		await this.library.saveDocument(updated);
	}

	async updateChapterHeadingOverride(
		documentId: string,
		chapterHeadingOverride: ChapterHeadingSettings | undefined
	): Promise<void> {
		if (!this.workspace) return;
		const existing = this.workspace.documents.find((document) => document.id === documentId);
		if (!existing || existing.kind !== 'chapter') return;
		const updated: ManuscriptDocument = {
			...existing,
			...(chapterHeadingOverride ? { chapterHeadingOverride } : {}),
			updatedAt: new Date().toISOString()
		};
		if (!chapterHeadingOverride) delete updated.chapterHeadingOverride;
		await this.library.saveDocument(updated);
		this.workspace = {
			...this.workspace,
			documents: this.workspace.documents.map((document) =>
				document.id === documentId ? updated : document
			)
		};
		this.showNotice(
			chapterHeadingOverride ? 'Chapter heading override saved.' : 'Using the book heading style.'
		);
	}

	async updateNoteBody(noteId: string, body: RichTextNode): Promise<void> {
		if (!this.workspace) return;
		const existing = this.workspace.notes.find((note) => note.id === noteId);
		if (!existing) return;
		const updated = { ...existing, body, updatedAt: new Date().toISOString() };
		this.workspace = {
			...this.workspace,
			notes: this.workspace.notes.map((note) => (note.id === noteId ? updated : note))
		};
		await this.library.saveNote(updated);
	}

	async updateNoteSummary(noteId: string, summary: string): Promise<void> {
		if (!this.workspace) return;
		const existing = this.workspace.notes.find((note) => note.id === noteId);
		if (!existing) return;
		const updated = { ...existing, summary, updatedAt: new Date().toISOString() };
		this.workspace = {
			...this.workspace,
			notes: this.workspace.notes.map((note) => (note.id === noteId ? updated : note))
		};
		await this.library.saveNote(updated);
	}

	async addNote(kind: NoteKind): Promise<void> {
		if (!this.workspace) return;
		const labels: Record<NoteKind, string> = {
			character: 'New character',
			environment: 'New place',
			plotline: 'New plotline',
			planning: 'New plan'
		};
		const note = createStoryNote({
			projectId: this.workspace.project.id,
			kind,
			title: labels[kind]
		});
		await this.library.saveNote(note);
		this.workspace = { ...this.workspace, notes: [...this.workspace.notes, note] };
		this.activeItemId = note.id;
		this.rememberWorkspace();
	}

	async addMedia(file: File): Promise<MediaInsertion> {
		if (!this.workspace) throw new Error('Open a novel before adding an image.');
		const asset = await createMediaAsset(this.workspace.project.id, file);
		await this.library.saveAsset(asset);
		const url = URL.createObjectURL(asset.bytes);
		this.assetUrls = new Map(this.assetUrls).set(asset.id, url);
		this.workspace = { ...this.workspace, assets: [...this.workspace.assets, asset] };
		return { assetId: asset.id, url, name: asset.name };
	}

	async setCover(side: 'front' | 'back', file: File): Promise<void> {
		if (!this.workspace) return;
		const inserted = await this.addMedia(file);
		const timestamp = new Date().toISOString();
		const project = {
			...this.workspace.project,
			...(side === 'front'
				? { frontCoverAssetId: inserted.assetId }
				: { backCoverAssetId: inserted.assetId }),
			updatedAt: timestamp
		};
		await this.library.saveProject(project);
		this.updateProject(project);
	}

	async clearCover(side: 'front' | 'back'): Promise<void> {
		if (!this.workspace) return;
		const project = { ...this.workspace.project, updatedAt: new Date().toISOString() };
		if (side === 'front') delete project.frontCoverAssetId;
		else delete project.backCoverAssetId;
		await this.library.saveProject(project);
		this.updateProject(project);
	}

	async updateBookSettings(input: {
		title: string;
		subtitle: string;
		author: string;
		synopsis: string;
		trimSize: TrimSize;
		typography: TypographyPreset;
		chapterHeading: ChapterHeadingSettings;
		pageNumbering: PageNumberingSettings;
	}): Promise<void> {
		if (!this.workspace) return;
		const project = {
			...this.workspace.project,
			...input,
			title: input.title.trim() || 'Untitled novel',
			author: input.author.trim(),
			updatedAt: new Date().toISOString()
		};
		await this.library.saveProject(project);
		this.updateProject(project);
		this.settingsOpen = false;
		this.showNotice('Book settings saved.');
	}

	async deleteCurrentProject(): Promise<void> {
		if (!this.workspace) return;
		const projectId = this.workspace.project.id;
		await this.library.deleteProject(projectId);
		this.projects = this.projects.filter((project) => project.id !== projectId);
		this.closeProject();
		this.showNotice('Novel deleted from this device.');
	}

	async login(email: string, password: string): Promise<void> {
		this.working = true;
		try {
			this.user = await this.accounts.login(email, password);
			this.library.configureUser(this.user);
			if (this.isPremium) await this.library.refreshFromCloud();
			await this.reloadAfterCloudChange();
			this.accountOpen = false;
			this.showNotice(`Welcome back${this.user.displayName ? `, ${this.user.displayName}` : ''}.`);
		} finally {
			this.working = false;
		}
	}

	async register(email: string, password: string, displayName: string): Promise<void> {
		this.working = true;
		try {
			this.user = await this.accounts.register({ email, password, displayName });
			this.library.configureUser(this.user);
			this.showNotice('Account created. Your novels are still saved on this device.');
		} finally {
			this.working = false;
		}
	}

	logout(): void {
		this.accounts.logout();
		this.user = undefined;
		this.library.configureUser(undefined);
		this.accountOpen = false;
		this.showNotice('Signed out. Your local books are still here.');
	}

	async migrateLocalLibrary(): Promise<void> {
		this.working = true;
		try {
			await this.library.migrateLocalProjects();
			await this.reloadAfterCloudChange();
			this.showNotice('Your local novels are now available in the cloud.');
		} finally {
			this.working = false;
		}
	}

	async requestPasswordReset(email: string): Promise<void> {
		await this.accounts.requestPasswordReset(email);
		this.showNotice('If that account exists, a reset link has been sent.');
	}

	async syncNow(): Promise<void> {
		await this.library.refreshFromCloud();
		await this.reloadAfterCloudChange();
	}

	async export(format: 'pdf' | 'epub'): Promise<void> {
		if (!this.workspace) return;
		this.exporting = format;
		try {
			if (format === 'pdf') {
				const { exportPdf } = await import('$lib/export/pdf-exporter');
				await exportPdf(this.workspace);
			} else {
				const { exportEpub } = await import('$lib/export/epub-exporter');
				await exportEpub(this.workspace);
			}
			this.showNotice(`${format.toUpperCase()} export is ready.`);
		} finally {
			this.exporting = undefined;
		}
	}

	chapterNumber(documentId: string): number | undefined {
		return this.workspace ? chapterNumber(this.workspace.documents, documentId) : undefined;
	}

	showError(message: string): void {
		this.error = message;
	}

	clearMessages(): void {
		this.notice = undefined;
		this.error = undefined;
	}

	private updateProject(project: NovelProject): void {
		if (!this.workspace) return;
		this.workspace = { ...this.workspace, project };
		this.projects = this.projects.map((item) => (item.id === project.id ? project : item));
	}

	private removeItemFromWorkspace(itemId: string): void {
		if (!this.workspace) return;
		this.workspace = {
			...this.workspace,
			documents: this.workspace.documents.filter((document) => document.id !== itemId),
			notes: this.workspace.notes.filter((note) => note.id !== itemId)
		};
		this.activeItemId =
			documentsOfKind(this.workspace.documents, 'chapter')[0]?.id ??
			this.workspace.documents[0]?.id ??
			this.workspace.notes[0]?.id;
		this.rememberWorkspace();
	}

	private replaceAssetUrls(assets: MediaAsset[]): void {
		revokeAssetUrls(this.assetUrls);
		this.assetUrls = createAssetUrls(assets);
	}

	private async reloadAfterCloudChange(): Promise<void> {
		this.projects = await this.library.listProjects();
		if (this.workspace) await this.openProject(this.workspace.project.id, this.activeItemId);
	}

	private firstWorkspaceItemId(workspace: WorkspaceSnapshot): string | undefined {
		return (
			documentsOfKind(workspace.documents, 'chapter')[0]?.id ??
			workspace.documents[0]?.id ??
			workspace.notes[0]?.id
		);
	}

	private workspaceItemExists(
		workspace: WorkspaceSnapshot,
		itemId: string | undefined
	): itemId is string {
		return Boolean(
			itemId &&
			(workspace.documents.some((document) => document.id === itemId) ||
				workspace.notes.some((note) => note.id === itemId))
		);
	}

	private rememberWorkspace(): void {
		this.library
			.savePreferences({
				id: 'current',
				activeProjectId: this.workspace?.project.id,
				activeItemId: this.activeItemId
			})
			.catch(() => undefined);
	}

	private showNotice(message: string): void {
		this.notice = message;
		this.error = undefined;
		if (this.noticeTimer) clearTimeout(this.noticeTimer);
		this.noticeTimer = setTimeout(() => {
			this.notice = undefined;
		}, 4_000);
	}
}
