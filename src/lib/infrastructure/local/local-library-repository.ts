import type { CloudLibraryItem, LocalLibraryPort, SyncableEntity } from '$lib/application/ports';
import { sortDocuments } from '$lib/domain/ordering';
import type {
	AppPreferences,
	LibraryEntityType,
	ManuscriptDocument,
	MediaAsset,
	NovelProject,
	PendingChange,
	StoryNote,
	WorkspaceSnapshot
} from '$lib/domain/types';
import { WriteANovelDatabase, localDatabase } from './database';

const CURRENT_PREFERENCES: AppPreferences = { id: 'current' };

export class LocalLibraryRepository implements LocalLibraryPort {
	constructor(private readonly database: WriteANovelDatabase = localDatabase) {}

	async listProjects(): Promise<NovelProject[]> {
		return this.database.projects.orderBy('updatedAt').reverse().toArray();
	}

	async getWorkspace(projectId: string): Promise<WorkspaceSnapshot | undefined> {
		const [project, documents, notes, assets] = await Promise.all([
			this.database.projects.get(projectId),
			this.database.documents.where('projectId').equals(projectId).toArray(),
			this.database.notes.where('projectId').equals(projectId).toArray(),
			this.database.assets.where('projectId').equals(projectId).toArray()
		]);

		if (!project) return undefined;

		return {
			project,
			documents: sortDocuments(documents),
			notes: notes.sort((left, right) => left.title.localeCompare(right.title)),
			assets
		};
	}

	async createProject(project: NovelProject, firstDocument: ManuscriptDocument): Promise<void> {
		await this.database.transaction(
			'rw',
			this.database.projects,
			this.database.documents,
			async () => {
				await this.database.projects.add(project);
				await this.database.documents.add(firstDocument);
			}
		);
	}

	async saveProject(project: NovelProject): Promise<void> {
		await this.database.projects.put(project);
	}

	async saveDocument(document: ManuscriptDocument): Promise<void> {
		await this.database.documents.put(document);
	}

	async saveNote(note: StoryNote): Promise<void> {
		await this.database.notes.put(note);
	}

	async saveAsset(asset: MediaAsset): Promise<void> {
		await this.database.assets.put(asset);
	}

	async deleteProject(projectId: string): Promise<void> {
		await this.database.transaction(
			'rw',
			[this.database.projects, this.database.documents, this.database.notes, this.database.assets],
			async () => {
				await Promise.all([
					this.database.projects.delete(projectId),
					this.database.documents.where('projectId').equals(projectId).delete(),
					this.database.notes.where('projectId').equals(projectId).delete(),
					this.database.assets.where('projectId').equals(projectId).delete()
				]);
			}
		);
	}

	async deleteEntity(entityType: LibraryEntityType, entityId: string): Promise<void> {
		switch (entityType) {
			case 'project':
				await this.deleteProject(entityId);
				break;
			case 'document':
				await this.database.documents.delete(entityId);
				break;
			case 'note':
				await this.database.notes.delete(entityId);
				break;
			case 'asset':
				await this.database.assets.delete(entityId);
				break;
		}
	}

	async getPreferences(): Promise<AppPreferences> {
		return (await this.database.preferences.get('current')) ?? CURRENT_PREFERENCES;
	}

	async savePreferences(preferences: AppPreferences): Promise<void> {
		await this.database.preferences.put(preferences);
	}

	async queueChange(change: PendingChange): Promise<void> {
		await this.database.outbox.put(change);
	}

	async listPendingChanges(): Promise<PendingChange[]> {
		return this.database.outbox.orderBy('enqueuedAt').toArray();
	}

	async removePendingChange(changeId: string): Promise<void> {
		await this.database.outbox.delete(changeId);
	}

	async getSyncableEntity(change: PendingChange): Promise<SyncableEntity | undefined> {
		switch (change.entityType) {
			case 'project': {
				const data = await this.database.projects.get(change.entityId);
				return data ? { entityType: 'project', data } : undefined;
			}
			case 'document': {
				const data = await this.database.documents.get(change.entityId);
				return data ? { entityType: 'document', data } : undefined;
			}
			case 'note': {
				const data = await this.database.notes.get(change.entityId);
				return data ? { entityType: 'note', data } : undefined;
			}
			case 'asset': {
				const data = await this.database.assets.get(change.entityId);
				return data ? { entityType: 'asset', data } : undefined;
			}
		}
	}

	async cacheCloudItem(item: CloudLibraryItem): Promise<void> {
		if (item.deleted) {
			await this.deleteEntity(item.entityType, item.entityId);
			return;
		}

		switch (item.entityType) {
			case 'project':
				await this.saveProject(item.data);
				break;
			case 'document':
				await this.saveDocument(item.data);
				break;
			case 'note':
				await this.saveNote(item.data);
				break;
			case 'asset':
				await this.saveAsset(item.data);
				break;
		}
	}

	async listAllSyncableEntities(): Promise<SyncableEntity[]> {
		const [projects, documents, notes, assets] = await Promise.all([
			this.database.projects.toArray(),
			this.database.documents.toArray(),
			this.database.notes.toArray(),
			this.database.assets.toArray()
		]);

		return [
			...projects.map((data): SyncableEntity => ({ entityType: 'project', data })),
			...documents.map((data): SyncableEntity => ({ entityType: 'document', data })),
			...notes.map((data): SyncableEntity => ({ entityType: 'note', data })),
			...assets.map((data): SyncableEntity => ({ entityType: 'asset', data }))
		];
	}
}
