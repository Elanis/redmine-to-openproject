import pg from 'pg';

import ObjectConversion from './ObjectConversion.js';
import QueryBuilder from './QueryBuilder.js';

import MigrationFn from './MigrationFn.js';

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

global.DEFAULT_CREATED_DATE = new Date('2016-06-01');
global.DEFAULT_UPDATED_DATE = new Date();

global.priorities = {
	'Bas': 'Low',
	'Normal': 'Low',
	'Haut': 'Normal',
	'Urgent' : 'High',
	'Immédiat' : 'Immediate',
};

global.modules = [
	'work_package_tracking',
	'repository',
	'calendar',
	'documents',
	'costs',
	'meetings',
	'backlogs',
	'board_view',
	'budgets',
	'activity',
];

/**
TABLES TO MIGRATE:
[ ] "agile_data"
[ ] "agile_colors"
[ ] "agile_sprints"
[ ] "ar_internal_metadata"
[ ] "attachments"
[ ] "auth_sources"
[ ] "boards"
[ ] "changes"
[ ] "changeset_parents"
[ ] "changesets"
[ ] "changesets_issues"
[ ] "checklist_template_categories"
[ ] "checklist_templates"
[ ] "checklists"
[ ] "comments"
[ ] "custom_field_enumerations"
[ ] "custom_fields"
[ ] "custom_fields_projects"
[ ] "custom_fields_roles"
[ ] "custom_fields_trackers"
[ ] "custom_values"
[ ] "documents"
[X] "email_addresses"
[X] "enabled_modules"
[ ] "enumerations"
[ ] "groups_users"
[ ] "imports"
[ ] "issue_categories"
[ ] "issue_relations"
[X] "issue_statuses"
[ ] "import_items"
[X] "issues"
[ ] "journal_details"
[ ] "journals"
[X] "member_roles"
[X] "members"
[ ] "messages"
[ ] "messenger_settings"
[ ] "news"
[ ] "open_id_authentication_associations"
[ ] "open_id_authentication_nonces"
[X] "projects"
[X] "projects_trackers"
[ ] "queries"
[ ] "queries_roles"
[ ] "repositories"
[ ] "roles"
[ ] "roles_managed_roles"
[ ] "schema_migrations"
[ ] "settings"
[ ] "tags"
[ ] "taggings"
[X] "time_entries"
[ ] "tokens"
[X] "trackers"
[X] "user_preferences"
[X] "users"
[X] "wiki_content_versions"
[X] "versions"
[ ] "watchers"
[X] "wiki_contents"
[X] "wiki_pages"
[X] "wiki_redirects"
[X] "wikis"
[X] "workflows"
**/

// CODE
global.redminePool = new pg.Pool(redmineCredentials);
global.openProjectPool = new pg.Pool(openProjectCredentials);

redminePool.on('error', console.log);
openProjectPool.on('error', console.log);

global.OPTypesList = [];
global.RedmineTrackersList = [];
global.OPStatusesList = [];
global.RedmineStatusesList = [];
global.OPEnum = [];
global.RedmineEnum = [];
global.issuePos = 0;


(async () => {
	/**
	 * Clean db
	 */
	await MigrationFn.cleanup();

	/**
	 * Gather data
	 */
	OPEnum = (await openProjectPool.query('SELECT * FROM enumerations')).rows;
	RedmineEnum = (await redminePool.query('SELECT * FROM enumerations')).rows;

	/**
	 * Migrate data
	 */
	await MigrationFn.users();
	await MigrationFn.trackers();
	await MigrationFn.statuses();
	await MigrationFn.projects();
	await MigrationFn.issues();
	await MigrationFn.timeEntries();
	await MigrationFn.wiki();
	await MigrationFn.workflows();
})();