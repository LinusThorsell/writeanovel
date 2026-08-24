import type { CloudLibraryPort, LocalLibraryPort, SyncableEntity } from './ports';
import type { AuthenticatedUser, PendingChange, SyncStatus } from '$lib/domain/types';

type SyncStatusListener = (status: SyncStatus) => void;

function pendingChangeFor(
	entity: SyncableEntity,
	timestamp = entity.data.updatedAt
): PendingChange {
	const projectId = entity.entityType === 'project' ? entity.data.id : entity.data.projectId;
	return {
		id: `${entity.entityType}:${entity.data.id}`,
		entityType: entity.entityType,
		entityId: entity.data.id,
		projectId,
		operation: 'upsert',
		enqueuedAt: timestamp
	};
}

export class SyncService {
	private user: AuthenticatedUser | undefined;
	private activeSync: Promise<void> | undefined;
	private listener: SyncStatusListener = () => undefined;

	constructor(
		private readonly local: LocalLibraryPort,
		private readonly cloud: CloudLibraryPort
	) {}

	configureUser(user: AuthenticatedUser | undefined): void {
		this.user = user;
		this.listener(user?.isPremium ? 'offline' : 'local');
	}

	onStatus(listener: SyncStatusListener): void {
		this.listener = listener;
	}

	isCloudEnabled(): boolean {
		return this.user?.isPremium === true;
	}

	async queueAllLocalData(): Promise<void> {
		const entities = await this.local.listAllSyncableEntities();
		await Promise.all(entities.map((entity) => this.local.queueChange(pendingChangeFor(entity))));
	}

	async syncNow(): Promise<void> {
		if (!this.isCloudEnabled()) {
			this.listener('local');
			return;
		}
		if (this.activeSync) return this.activeSync;

		this.activeSync = this.performSync().finally(() => {
			this.activeSync = undefined;
		});
		return this.activeSync;
	}

	private async performSync(): Promise<void> {
		this.listener('syncing');
		try {
			const pending = await this.local.listPendingChanges();
			for (const change of pending) {
				const remote =
					change.operation === 'delete'
						? await this.cloud.pushDeletion(change)
						: await this.pushLocalChange(change);
				if (remote) await this.local.cacheCloudItem(remote);
				await this.local.removePendingChange(change.id);
			}

			const remoteItems = await this.cloud.listItems();
			for (const item of remoteItems) await this.local.cacheCloudItem(item);
			this.listener('synced');
		} catch (error) {
			const offline = typeof navigator !== 'undefined' && !navigator.onLine;
			this.listener(offline ? 'offline' : 'error');
			throw error;
		}
	}

	private async pushLocalChange(change: PendingChange) {
		const entity = await this.local.getSyncableEntity(change);
		return entity ? this.cloud.pushEntity(entity) : this.cloud.pushDeletion(change);
	}
}

export { pendingChangeFor };
