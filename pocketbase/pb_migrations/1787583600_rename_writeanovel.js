migrate(
	(app) => {
		const settings = app.settings();
		settings.meta.appName = 'WriteANovel';
		app.save(settings);
	},
	(app) => {
		const settings = app.settings();
		settings.meta.appName = 'WriteABook';
		app.save(settings);
	}
);
