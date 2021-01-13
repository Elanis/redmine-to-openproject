import pg from 'pg';

// CREDENTIALS
const redmineCredentials = {
	user: '',
	host: 'localhost',
	database: '',
	password: '',
	port: 5432,
};
const openProjectCredentials = {
	user: '',
	host: 'localhost',
	database: '',
	password: '',
	port: 5432,
};

/**
TABLES TO MIGRATE:
[ ] "ar_internal_metadata"
[ ] "attachments"
[ ] "auth_sources"
[ ] "boards"
[ ] "changes"
[ ] "changeset_parents"
[ ] "changesets"
[ ] "changesets_issues"
[ ] "comments"
[ ] "custom_field_enumerations"
[ ] "custom_fields"
[ ] "custom_fields_projects"
[ ] "custom_fields_roles"
[ ] "custom_fields_trackers"
[ ] "custom_values"
[ ] "documents"
[ ] "email_addresses"
[ ] "enabled_modules"
[ ] "enumerations"
[ ] "groups_users"
[ ] "imports"
[ ] "issue_categories"
[ ] "issue_relations"
[ ] "issue_statuses"
[ ] "import_items"
[ ] "issues"
[ ] "journal_details"
[ ] "journals"
[ ] "member_roles"
[ ] "members"
[ ] "messages"
[ ] "news"
[ ] "open_id_authentication_associations"
[ ] "open_id_authentication_nonces"
[ ] "messenger_settings"
[X] "projects"
[ ] "projects_trackers"
[ ] "queries"
[ ] "queries_roles"
[ ] "repositories"
[ ] "roles"
[ ] "roles_managed_roles"
[ ] "schema_migrations"
[ ] "settings"
[ ] "tokens"
[ ] "user_preferences"
[ ] "wiki_content_versions"
[ ] "users"
[X] "versions"
[ ] "watchers"
[ ] "wiki_contents"
[ ] "time_entries"
[ ] "wiki_pages"
[X] "trackers"
[ ] "wiki_redirects"
[ ] "wikis"
[ ] "workflows"
[ ] "agile_data"
[ ] "agile_colors"
[ ] "agile_sprints"
[ ] "checklist_template_categories"
[ ] "checklist_templates"
[ ] "checklists"
[ ] "tags"
[ ] "taggings"
**/

// CODE
const redminePool = new pg.Pool(redmineCredentials);
const openProjectPool = new pg.Pool(openProjectCredentials);

function buildUpdateQuery(table, fields) {
	let query = 'UPDATE "' + table + '" SET';
	const values = [];

	for(const key in fields) {
		values.push(fields[key]);
		query += ' "' + key + '" = $' + values.length + ',';
	}

	query = query.substr(0, query.length-1);

	return [query, values];
}

function buildInsertQuery(table, fields) {
	let query = 'INSERT INTO "' + table + '"(';
	let columns = '';
	let valueStr = '';
	const values = [];

	for(const key in fields) {
		values.push(fields[key]);

		columns += '"' + key + '",';
		valueStr += '$' + values.length + ',';
	}

	columns = columns.substr(0, columns.length - 1);
	valueStr = valueStr.substr(0, valueStr.length - 1);

	query += columns + ') VALUES (' + valueStr + ')';

	return [query, values];
}

function transformProjectObject(project) {
	return {
		id: project.id,
		name: project.name,
		description: project.description,
		public: project.is_public,
		parent_id: project.parent_id,
		created_at: project.created_on,
		updated_at: project.updated_on,
		identifier: project.identifier,
		lft: project.lft,
		rgt: project.rgt,
		templated: false,
		// ?: project.homepage,
		// ?: project.status,
		// ?: project.inherit_members,
		// ?: project.default_version_id,
		// ?: project.default_assigned_to_id,
	};
}

function transformVersionObject(version) {
	return {
		id: version.id,
		project_id: version.project_id,
		name: version.name,
		description: version.description,
		effective_date: version.effective_date,
		created_at: version.created_on,
		updated_at: version.updated_on,
		wiki_page_title: version.wiki_page_title,
		status: version.status,
		sharing: version.sharing,
		// ?: version.start_date,
	};
}

function transformTrackerObject(tracker) {
	return {
		id: tracker.id,
		name: tracker.name,
		// ?: tracker.is_in_chlog,
		position: tracker.position,
		is_in_roadmap: tracker.is_in_roadmap,
		is_milestone: false,
		is_default: true,
		color_id: 1,
		// ?: tracker.fields_bits,
		// ?: tracker.default_status_id,
		// ?: tracker.description,
		created_at: new Date('2016-06-01'),
		updated_at: new Date(),
		is_standard: false,
		attribute_groups: null,
		description: '',
	};
}

(async () => {
	/**
	 * Clean db
	 */
	console.log('Cleaning versions');
	await openProjectPool.query('DELETE FROM versions');

	console.log('Cleaning projects');
	await openProjectPool.query('DELETE FROM projects');

	/**
	 * Migrate data
	 */
	// Trackers
	const RedmineTrackersList = (await redminePool.query('SELECT * FROM trackers')).rows;
	for(const RedmineTracker of RedmineTrackersList) {
		if((await openProjectPool.query('SELECT * FROM types WHERE name = $1', [RedmineTracker.name])).rows.length === 0) {
			console.log('Inserting tracker/type ' + RedmineTracker.name);
			const [query, values] = buildInsertQuery('types', transformTrackerObject(RedmineTracker));
			await openProjectPool.query(query, values);
		}
	}
	const OPTypesList = (await openProjectPool.query('SELECT * FROM types')).rows;

	// Projects
	const projectList = (await redminePool.query('SELECT * FROM projects')).rows;

	for(const project of projectList) {
		console.log('Inserting project ' + project.name);

		const [query, values] = buildInsertQuery('projects', transformProjectObject(project));
		await openProjectPool.query(query, values);

		// Versions
		const versionList = (await redminePool.query('SELECT * FROM versions WHERE project_id = $1', [project.id])).rows;
		for(const version of versionList) {
			console.log('  Inserting version ' + version.name);

			const [query, values] = buildInsertQuery('versions', transformVersionObject(version));
			await openProjectPool.query(query, values);
		}
	}
})();