migrate(
	(app) => {
		const users = app.findCollectionByNameOrId('users');
		users.listRule = 'id = @request.auth.id';
		users.viewRule = 'id = @request.auth.id';
		users.createRule = '';
		users.updateRule = 'id = @request.auth.id';
		users.deleteRule = 'id = @request.auth.id';
		users.fields.add(
			new TextField({
				name: 'display_name',
				max: 120
			}),
			new BoolField({ name: 'is_premium' })
		);
		users.passwordAuth.enabled = true;
		users.passwordAuth.identityFields = ['email'];
		users.resetPasswordTemplate.subject = 'Reset your {APP_NAME} password';
		users.resetPasswordTemplate.body =
			'<p>Hello,</p><p>Use the button below to choose a new password.</p><p><a class="btn" href="{APP_URL}/reset-password?token={TOKEN}" target="_blank" rel="noopener">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>';

		app.save(users);

		const settings = app.settings();
		settings.meta.appName = 'WriteABook';
		settings.meta.appURL = $os.getenv('PB_APP_URL') || 'http://localhost:3000';
		app.save(settings);

		const libraryItems = new Collection({
			type: 'base',
			name: 'library_items',
			listRule: 'user = @request.auth.id && @request.auth.is_premium = true',
			viewRule: 'user = @request.auth.id && @request.auth.is_premium = true',
			createRule: '@request.body.user = @request.auth.id && @request.auth.is_premium = true',
			updateRule: 'user = @request.auth.id && @request.auth.is_premium = true',
			deleteRule: 'user = @request.auth.id && @request.auth.is_premium = true',
			fields: [
				{
					name: 'user',
					type: 'relation',
					required: true,
					maxSelect: 1,
					collectionId: users.id,
					cascadeDelete: true
				},
				{
					name: 'client_id',
					type: 'text',
					required: true,
					max: 100
				},
				{
					name: 'entity_type',
					type: 'select',
					required: true,
					maxSelect: 1,
					values: ['project', 'document', 'note', 'asset']
				},
				{
					name: 'project_id',
					type: 'text',
					max: 100
				},
				{
					name: 'payload',
					type: 'json'
				},
				{
					name: 'asset',
					type: 'file',
					protected: true,
					maxSelect: 1,
					maxSize: 20971520,
					mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
				},
				{
					name: 'client_updated',
					type: 'text',
					required: true,
					max: 40
				},
				{
					name: 'is_deleted',
					type: 'bool'
				}
			],
			indexes: [
				'CREATE UNIQUE INDEX idx_library_user_client ON library_items (user, client_id)',
				'CREATE INDEX idx_library_project ON library_items (user, project_id)'
			]
		});

		app.save(libraryItems);
	},
	(app) => {
		app.delete(app.findCollectionByNameOrId('library_items'));
		const users = app.findCollectionByNameOrId('users');
		users.fields.removeByName('display_name');
		users.fields.removeByName('is_premium');
		app.save(users);
	}
);
