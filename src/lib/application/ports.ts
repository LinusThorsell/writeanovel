import type {
	AppPreferences,
	AuthenticatedUser,
	LibraryEntityType,
	ManuscriptDocument,
	MediaAsset,
	NovelProject,
	PendingChange,
	StoryNote,
	WorkspaceSnapshot
} from '$lib/domain/types';

export type SyncableEntity =
	| { entityType: 'project'; data: NovelProject }
	| { entityType: 'document'; data: ManuscriptDocument }
	| { entityType: 'note'; data: StoryNote }
	| { entityType: 'asset'; data: MediaAsset };

export type CloudLibraryItem =
	| (SyncableEntity & {
			entityId: string;
			projectId: string;
			updatedAt: string;
			deleted: false;
	  })
	| {
			entityType: LibraryEntityType;
			entityId: string;
			projectId: string;
			updatedAt: string;
			deleted: true;
	  };

export interface LocalLibraryPort {
	listProjects(): Promise<NovelProject[]>;
	getWorkspace(projectId: string): Promise<WorkspaceSnapshot | undefined>;
	createProject(project: NovelProject, firstDocument: ManuscriptDocument): Promise<void>;
	saveProject(project: NovelProject): Promise<void>;
	saveDocument(document: ManuscriptDocument): Promise<void>;
	saveNote(note: StoryNote): Promise<void>;
	saveAsset(asset: MediaAsset): Promise<void>;
	deleteProject(projectId: string): Promise<void>;
	deleteEntity(entityType: LibraryEntityType, entityId: string): Promise<void>;
	getPreferences(): Promise<AppPreferences>;
	savePreferences(preferences: AppPreferences): Promise<void>;
	queueChange(change: PendingChange): Promise<void>;
	listPendingChanges(): Promise<PendingChange[]>;
	removePendingChange(changeId: string): Promise<void>;
	getSyncableEntity(change: PendingChange): Promise<SyncableEntity | undefined>;
	cacheCloudItem(item: CloudLibraryItem): Promise<void>;
	listAllSyncableEntities(): Promise<SyncableEntity[]>;
}

export interface CloudLibraryPort {
	listItems(): Promise<CloudLibraryItem[]>;
	pushEntity(entity: SyncableEntity): Promise<CloudLibraryItem>;
	pushDeletion(change: PendingChange): Promise<CloudLibraryItem>;
}

export interface AccountPort {
	currentUser(): AuthenticatedUser | undefined;
	register(input: {
		email: string;
		password: string;
		displayName: string;
	}): Promise<AuthenticatedUser>;
	login(email: string, password: string): Promise<AuthenticatedUser>;
	refresh(): Promise<AuthenticatedUser | undefined>;
	logout(): void;
	requestPasswordReset(email: string): Promise<void>;
	confirmPasswordReset(token: string, password: string): Promise<void>;
}
