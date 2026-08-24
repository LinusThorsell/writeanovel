migrate(
	(app) => {
		const users = app.findCollectionByNameOrId('users');
		users.createRule = '@request.body.is_premium:isset = false';
		users.updateRule = 'id = @request.auth.id && @request.body.is_premium:changed = false';
		app.save(users);
	},
	(app) => {
		const users = app.findCollectionByNameOrId('users');
		users.createRule = '';
		users.updateRule = 'id = @request.auth.id';
		app.save(users);
	}
);
