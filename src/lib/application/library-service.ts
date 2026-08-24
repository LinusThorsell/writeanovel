import type { LocalLibraryPort } from './ports';
import { SyncService, pendingChangeFor } from './sync-service';
import type {
	AuthenticatedUser,
	LibraryEntityType,
	ManuscriptDocument,
	MediaAsset,
	NovelProject,
	PendingChange,
	StoryNote,
	SyncStatus,
	WorkspaceSnapshot
} from '$lib/domain/types';

type SyncListener = (status: SyncStatus) => void;

export class LibraryService {
	private user: AuthenticatedUser | undefined;
	private syncTimer: ReturnType<typeof setTimeout> | undefined;

	constructor(
		private readonly local: LocalLibraryPort,
		private readonly sync: SyncService
	) {}

	configureUser(user: AuthenticatedUser | undefined): void {
		this.user = user;
		this.sync.configureUser(user);
	}

	onSyncStatus(listener: SyncListener): void {
		this.sync.onStatus(listener);
	}

	async listProjects(): Promise<NovelProject[]> {
		return this.local.listProjects();
	}

	async getWorkspace(projectId: string): Promise<WorkspaceSnapshot | undefined> {
		return this.local.getWorkspace(projectId);
	}

	async createProject(project: NovelProject, firstDocument: ManuscriptDocument): Promise<void> {
		await this.local.createProject(project, firstDocument);
		if (!this.isPremium()) return;
		await Promise.all([
			this.local.queueChange(pendingChangeFor({ entityType: 'project', data: project })),
			this.local.queueChange(pendingChangeFor({ entityType: 'document', data: firstDocument }))
		]);
		this.scheduleSync();
	}

	async saveProject(project: NovelProject): Promise<void> {
		await this.local.saveProject(project);
		await this.queuePremiumChange({ entityType: 'project', data: project });
	}

	async saveDocument(document: ManuscriptDocument): Promise<void> {
		await this.local.saveDocument(document);
		await this.queuePremiumChange({ entityType: 'document', data: document });
	}

	async saveNote(note: StoryNote): Promise<void> {
		await this.local.saveNote(note);
		await this.queuePremiumChange({ entityType: 'note', data: note });
	}

	async saveAsset(asset: MediaAsset): Promise<void> {
		await this.local.saveAsset(asset);
		await this.queuePremiumChange({ entityType: 'asset', data: asset });
	}

	async deleteProject(projectId: string): Promise<void> {
		const workspace = await this.local.getWorkspace(projectId);
		await this.local.deleteProject(projectId);
		if (!workspace || !this.isPremium()) return;

		const changes = [
			this.deletion('project', workspace.project.id, projectId),
			...workspace.documents.map((document) => this.deletion('document', document.id, projectId)),
			...workspace.notes.map((note) => this.deletion('note', note.id, projectId)),
			...workspace.assets.map((asset) => this.deletion('asset', asset.id, projectId))
		];
		await Promise.all(changes.map((change) => this.local.queueChange(change)));
		this.scheduleSync();
	}

	async deleteDocument(document: ManuscriptDocument): Promise<void> {
		await this.deleteEntity('document', document.id, document.projectId);
	}

	async deleteNote(note: StoryNote): Promise<void> {
		await this.deleteEntity('note', note.id, note.projectId);
	}

	async deleteAsset(asset: MediaAsset): Promise<void> {
		await this.deleteEntity('asset', asset.id, asset.projectId);
	}

	async migrateLocalProjects(): Promise<void> {
		if (!this.isPremium()) throw new Error('Premium access is required for cloud migration.');
		await this.sync.queueAllLocalData();
		await this.sync.syncNow();
	}

	async refreshFromCloud(): Promise<void> {
		await this.sync.syncNow();
	}

	private isPremium(): boolean {
		return this.user?.isPremium === true;
	}

	private async queuePremiumChange(
		entity:
			| { entityType: 'project'; data: NovelProject }
			| { entityType: 'document'; data: ManuscriptDocument }
			| { entityType: 'note'; data: StoryNote }
			| { entityType: 'asset'; data: MediaAsset }
	): Promise<void> {
		if (!this.isPremium()) return;
		await this.local.queueChange(pendingChangeFor(entity));
		this.scheduleSync();
	}

	private async deleteEntity(
		entityType: LibraryEntityType,
		entityId: string,
		projectId: string
	): Promise<void> {
		await this.local.deleteEntity(entityType, entityId);
		if (!this.isPremium()) return;
		await this.local.queueChange(this.deletion(entityType, entityId, projectId));
		this.scheduleSync();
	}

	private deletion(
		entityType: LibraryEntityType,
		entityId: string,
		projectId: string
	): PendingChange {
		return {
			id: `${entityType}:${entityId}`,
			entityType,
			entityId,
			projectId,
			operation: 'delete',
			enqueuedAt: new Date().toISOString()
		};
	}

	private scheduleSync(): void {
		if (this.syncTimer) clearTimeout(this.syncTimer);
		this.syncTimer = setTimeout(() => {
			this.sync.syncNow().catch(() => undefined);
		}, 800);
	}
}
