import type { CloudLibraryItem, CloudLibraryPort, SyncableEntity } from '$lib/application/ports';
import type {
	JsonObject,
	LibraryEntityType,
	ManuscriptDocument,
	MediaAsset,
	NovelProject,
	PendingChange,
	StoryNote
} from '$lib/domain/types';
import PocketBase, { ClientResponseError, type RecordModel } from 'pocketbase';
import { pocketBaseClient } from './client';

type CloudAssetMetadata = Omit<MediaAsset, 'bytes'>;

type LibraryRecordBase = RecordModel & {
	user: string;
	client_id: string;
	project_id: string;
	client_updated: string;
	is_deleted: boolean;
	asset: string;
};

type LibraryItemRecord =
	| (LibraryRecordBase & { entity_type: 'project'; payload: NovelProject })
	| (LibraryRecordBase & { entity_type: 'document'; payload: ManuscriptDocument })
	| (LibraryRecordBase & { entity_type: 'note'; payload: StoryNote })
	| (LibraryRecordBase & { entity_type: 'asset'; payload: CloudAssetMetadata });

function projectIdFor(entity: SyncableEntity): string {
	return entity.entityType === 'project' ? entity.data.id : entity.data.projectId;
}

function entityUpdatedAt(entity: SyncableEntity): string {
	return entity.data.updatedAt;
}

function metadataFor(asset: MediaAsset): CloudAssetMetadata {
	return {
		id: asset.id,
		projectId: asset.projectId,
		name: asset.name,
		mimeType: asset.mimeType,
		...(asset.drawing ? { drawing: asset.drawing } : {}),
		createdAt: asset.createdAt,
		updatedAt: asset.updatedAt
	};
}

export class PocketBaseCloudLibraryGateway implements CloudLibraryPort {
	constructor(private readonly client: PocketBase = pocketBaseClient) {}

	async listItems(): Promise<CloudLibraryItem[]> {
		const records = await this.client.collection<LibraryItemRecord>('library_items').getFullList({
			sort: 'client_updated'
		});
		const hasAssets = records.some(
			(record) => record.entity_type === 'asset' && !record.is_deleted
		);
		const fileToken = hasAssets ? await this.client.files.getToken() : '';
		return Promise.all(records.map((record) => this.toCloudItem(record, fileToken)));
	}

	async pushEntity(entity: SyncableEntity): Promise<CloudLibraryItem> {
		const existing = await this.findRecord(entity.data.id);
		const updatedAt = entityUpdatedAt(entity);

		if (existing && existing.client_updated > updatedAt) {
			const token =
				existing.entity_type === 'asset' && !existing.is_deleted
					? await this.client.files.getToken()
					: '';
			return this.toCloudItem(existing, token);
		}

		const saved = await this.saveEntity(entity, existing?.id);
		if (entity.entityType === 'asset') {
			return {
				entityType: 'asset',
				entityId: entity.data.id,
				projectId: entity.data.projectId,
				updatedAt,
				deleted: false,
				data: entity.data
			};
		}
		return this.toCloudItem(saved, '');
	}

	async pushDeletion(change: PendingChange): Promise<CloudLibraryItem> {
		const existing = await this.findRecord(change.entityId);
		if (existing && existing.client_updated > change.enqueuedAt) {
			const token =
				existing.entity_type === 'asset' && !existing.is_deleted
					? await this.client.files.getToken()
					: '';
			return this.toCloudItem(existing, token);
		}

		const data = {
			user: this.requireUserId(),
			client_id: change.entityId,
			entity_type: change.entityType,
			project_id: change.projectId,
			payload: {},
			client_updated: change.enqueuedAt,
			is_deleted: true
		};

		if (existing) {
			await this.client.collection('library_items').update(existing.id, data);
		} else {
			await this.client.collection('library_items').create(data);
		}

		return {
			entityType: change.entityType,
			entityId: change.entityId,
			projectId: change.projectId,
			updatedAt: change.enqueuedAt,
			deleted: true
		};
	}

	private requireUserId(): string {
		const userId = this.client.authStore.record?.id;
		if (!userId) throw new Error('Cloud storage requires an authenticated account.');
		return userId;
	}

	private async findRecord(clientId: string): Promise<LibraryItemRecord | undefined> {
		try {
			return await this.client
				.collection<LibraryItemRecord>('library_items')
				.getFirstListItem(this.client.filter('client_id = {:clientId}', { clientId }));
		} catch (error) {
			if (error instanceof ClientResponseError && error.status === 404) return undefined;
			throw error;
		}
	}

	private async saveEntity(entity: SyncableEntity, recordId?: string): Promise<LibraryItemRecord> {
		if (entity.entityType === 'asset') {
			const form = new FormData();
			form.set('user', this.requireUserId());
			form.set('client_id', entity.data.id);
			form.set('entity_type', entity.entityType);
			form.set('project_id', entity.data.projectId);
			form.set('payload', JSON.stringify(metadataFor(entity.data)));
			form.set('client_updated', entity.data.updatedAt);
			form.set('is_deleted', 'false');
			form.set('asset', entity.data.bytes, entity.data.name);

			return recordId
				? this.client.collection<LibraryItemRecord>('library_items').update(recordId, form)
				: this.client.collection<LibraryItemRecord>('library_items').create(form);
		}

		const payload: NovelProject | ManuscriptDocument | StoryNote = entity.data;
		const data = {
			user: this.requireUserId(),
			client_id: entity.data.id,
			entity_type: entity.entityType,
			project_id: projectIdFor(entity),
			payload,
			client_updated: entity.data.updatedAt,
			is_deleted: false
		};

		return recordId
			? this.client.collection<LibraryItemRecord>('library_items').update(recordId, data)
			: this.client.collection<LibraryItemRecord>('library_items').create(data);
	}

	private async toCloudItem(
		record: LibraryItemRecord,
		fileToken: string
	): Promise<CloudLibraryItem> {
		if (record.is_deleted) {
			return {
				entityType: record.entity_type,
				entityId: record.client_id,
				projectId: record.project_id,
				updatedAt: record.client_updated,
				deleted: true
			};
		}

		switch (record.entity_type) {
			case 'project':
				return {
					entityType: 'project',
					entityId: record.client_id,
					projectId: record.project_id,
					updatedAt: record.client_updated,
					deleted: false,
					data: record.payload
				};
			case 'document':
				return {
					entityType: 'document',
					entityId: record.client_id,
					projectId: record.project_id,
					updatedAt: record.client_updated,
					deleted: false,
					data: record.payload
				};
			case 'note':
				return {
					entityType: 'note',
					entityId: record.client_id,
					projectId: record.project_id,
					updatedAt: record.client_updated,
					deleted: false,
					data: record.payload
				};
			case 'asset': {
				const url = this.client.files.getURL(record, record.asset, { token: fileToken });
				const response = await fetch(url);
				if (!response.ok) throw new Error(`Unable to download cloud asset ${record.client_id}.`);
				const bytes = await response.blob();
				return {
					entityType: 'asset',
					entityId: record.client_id,
					projectId: record.project_id,
					updatedAt: record.client_updated,
					deleted: false,
					data: { ...record.payload, bytes }
				};
			}
		}
	}
}
