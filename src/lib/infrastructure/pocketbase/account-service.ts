import type { AccountPort } from '$lib/application/ports';
import type { AuthenticatedUser } from '$lib/domain/types';
import PocketBase, { ClientResponseError, type RecordModel } from 'pocketbase';
import { pocketBaseClient } from './client';

type UserRecord = RecordModel & {
	email: string;
	display_name: string;
	is_premium: boolean;
};

function toUser(record: UserRecord): AuthenticatedUser {
	return {
		id: record.id,
		email: record.email,
		displayName: record.display_name,
		isPremium: record.is_premium
	};
}

export class PocketBaseAccountService implements AccountPort {
	constructor(private readonly client: PocketBase = pocketBaseClient) {}

	currentUser(): AuthenticatedUser | undefined {
		const record = this.client.authStore.record;
		if (!this.client.authStore.isValid || !record || record.collectionName !== 'users') {
			return undefined;
		}

		return {
			id: record.id,
			email: String(record.email ?? ''),
			displayName: String(record.display_name ?? ''),
			isPremium: record.is_premium === true
		};
	}

	async register(input: {
		email: string;
		password: string;
		displayName: string;
	}): Promise<AuthenticatedUser> {
		await this.client.collection<UserRecord>('users').create({
			email: input.email.trim().toLowerCase(),
			password: input.password,
			passwordConfirm: input.password,
			display_name: input.displayName.trim()
		});

		return this.login(input.email, input.password);
	}

	async login(email: string, password: string): Promise<AuthenticatedUser> {
		const response = await this.client
			.collection<UserRecord>('users')
			.authWithPassword(email.trim().toLowerCase(), password);
		return toUser(response.record);
	}

	async refresh(): Promise<AuthenticatedUser | undefined> {
		if (!this.client.authStore.isValid) return undefined;

		try {
			const response = await this.client.collection<UserRecord>('users').authRefresh();
			return toUser(response.record);
		} catch (error) {
			if (error instanceof ClientResponseError && (error.status === 401 || error.status === 403)) {
				this.client.authStore.clear();
				return undefined;
			}
			return this.currentUser();
		}
	}

	logout(): void {
		this.client.authStore.clear();
	}

	async requestPasswordReset(email: string): Promise<void> {
		await this.client.collection('users').requestPasswordReset(email.trim().toLowerCase());
	}

	async confirmPasswordReset(token: string, password: string): Promise<void> {
		await this.client.collection('users').confirmPasswordReset(token, password, password);
	}
}
