import pg from 'pg';

import ObjectConversion from './ObjectConversion.js';
import QueryBuilder from './QueryBuilder.js';

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

const DEFAULT_CREATED_DATE = new Date('2016-06-01');
const DEFAULT_UPDATED_DATE = new Date();

const priorities = {
	'Bas': 'Low',
	'Normal': 'Low',
	'Haut': 'Normal',
	'Urgent' : 'High',
	'Immédiat' : 'Immediate',
};

const modules = [
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
[ ] "news"
[ ] "open_id_authentication_associations"
[ ] "open_id_authentication_nonces"
[ ] "messenger_settings"
[X] "projects"
[X] "projects_trackers"
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
[X] "time_entries"
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

redminePool.on('error', console.log);
openProjectPool.on('error', console.log);

let OPTypesList = [];
let RedmineTrackersList = [];
let OPStatusesList = [];
let RedmineStatusesList = [];
let OPEnum = [];
let RedmineEnum = [];
let issuePos = 0;
function transformIssueObject(issue) {
	// Tracker
	const tracker = RedmineTrackersList.filter((elt) => elt.id == issue.tracker_id)[0];
	if(typeof tracker === 'undefined' || typeof tracker.id === 'undefined') {
		throw new Error('invalid tracker "' + issue.tracker_id + '".');
	}

	const type = OPTypesList.filter((elt) => elt.name === tracker.name)[0];
	if(typeof type === 'undefined' || typeof type.id === 'undefined') {
		throw new Error('invalid type "' + issue.tracker_id + '".');
	}

	// Status
	const redstatus = RedmineStatusesList.filter((elt) => elt.id == issue.status_id)[0];
	if(typeof redstatus === 'undefined' || typeof redstatus.id === 'undefined') {
		throw new Error('invalid redmine status "' + issue.status_id + '".');
	}

	const opstatus = OPStatusesList.filter((elt) => elt.name === redstatus.name)[0];
	if(typeof opstatus === 'undefined' || typeof opstatus.id === 'undefined') {
		throw new Error('invalid openproject status "' + issue.status_id + '".');
	}

	// Enumerations
	const redenum = RedmineEnum.filter((elt) => elt.id == issue.priority_id)[0];
	if(typeof redenum === 'undefined' || typeof redenum.id === 'undefined') {
		throw new Error('invalid redmine priority "' + issue.priority_id + '".');
	}

	const openum = OPEnum.filter((elt) => elt.name === priorities[redenum.name])[0];
	if(typeof openum === 'undefined' || typeof openum.id === 'undefined') {
		throw new Error('invalid openproject priority "' + issue.priority_id + '".');
	}

	return {
		id: issue.id,
		type_id: type.id,
		project_id: issue.project_id,
		subject: issue.subject,
		description: issue.description,
		due_date: issue.due_date,
		category_id: issue.category_id,
		status_id: opstatus.id,
		assigned_to_id: issue.assigned_to_id,
		priority_id: openum.id,
		version_id: issue.fixed_version_id,
		author_id: issue.author_id,
		lock_version: issue.lock_version,
		created_at: issue.created_on,
		updated_at: issue.updated_on,
		start_date: issue.start_date,
		done_ratio: issue.done_ratio,
		estimated_hours: issue.estimated_hours,
		// ?: issue.parent_id,
		// ?: issue.root_id,
		// ?: issue.lft,
		// ?: issue.rgt,
		// ?: issue.is_private,
		// ?: issue.closed_on,
		responsible_id: null,
		budget_id: null,
		position: issuePos++,
		// story_points: TODO: GET FROM SP TABLE
		// remaining_hours: TODO: CALCULATE
		// derivated_estimated_hours: TODO: CALCULATE
		schedule_manually: false,
	};
}

(async () => {
	/**
	 * Clean db
	 */
	console.log('Cleaning enabled_modules');
	await openProjectPool.query('DELETE FROM enabled_modules');

	console.log('Cleaning relations');
	await openProjectPool.query('DELETE FROM relations');

	console.log('Cleaning project_statuses');
	await openProjectPool.query('DELETE FROM project_statuses');

	console.log('Cleaning member_roles');
	await openProjectPool.query('DELETE FROM member_roles');

	console.log('Cleaning members');
	await openProjectPool.query('DELETE FROM members');

	console.log('Cleaning time_entries');
	await openProjectPool.query('DELETE FROM time_entries');

	console.log('Cleaning issues');
	await openProjectPool.query('DELETE FROM work_packages');

	console.log('Cleaning projects_types');
	await openProjectPool.query('DELETE FROM projects_types');

	console.log('Cleaning versions');
	await openProjectPool.query('DELETE FROM versions');

	console.log('Cleaning projects');
	await openProjectPool.query('DELETE FROM projects');

	OPEnum = (await openProjectPool.query('SELECT * FROM enumerations')).rows;
	RedmineEnum = (await redminePool.query('SELECT * FROM enumerations')).rows;

	/**
	 * Migrate data
	 */
	// Trackers
	RedmineTrackersList = (await redminePool.query('SELECT * FROM trackers')).rows;
	for(const RedmineTracker of RedmineTrackersList) {
		if((await openProjectPool.query('SELECT * FROM types WHERE name = $1', [RedmineTracker.name])).rows.length === 0) {
			console.log('Inserting tracker/type ' + RedmineTracker.name);
			const [query, values] = QueryBuilder.buildInsertQuery('types', ObjectConversion.RedmineTrackerToOPType(RedmineTracker));
			await openProjectPool.query(query, values);
		}
	}
	OPTypesList = (await openProjectPool.query('SELECT * FROM types')).rows;

	// Trackers
	RedmineStatusesList = (await redminePool.query('SELECT * FROM issue_statuses')).rows;
	for(const RedmineStatus of RedmineStatusesList) {
		if((await openProjectPool.query('SELECT * FROM statuses WHERE name = $1', [RedmineStatus.name])).rows.length === 0) {
			console.log('Inserting status ' + RedmineStatus.name);
			const [query, values] = QueryBuilder.buildInsertQuery('statuses', ObjectConversion.RedmineIssueStatusToOPStatus(RedmineStatus));
			await openProjectPool.query(query, values);
		}
	}
	OPStatusesList = (await openProjectPool.query('SELECT * FROM statuses')).rows;

	// Projects
	await openProjectPool.query('SELECT setval(\'member_roles_id_seq\', $1, true);', [1]);
	await openProjectPool.query('SELECT setval(\'members_id_seq\', $1, true);', [1]);
	await openProjectPool.query('SELECT setval(\'project_statuses_id_seq\', $1, true);', [1]);
	await openProjectPool.query('SELECT setval(\'enabled_modules_id_seq\', $1, true);', [1]);

	const projectList = (await redminePool.query('SELECT * FROM projects ORDER BY id')).rows;
	for(const project of projectList) {
		console.log('Inserting project ' + project.name);

		const [query, values] = QueryBuilder.buildInsertQuery('projects', ObjectConversion.RedmineProjectToOPProject(project));
		await openProjectPool.query(query, values);

		// Versions
		const versionList = (await redminePool.query('SELECT * FROM versions WHERE project_id = $1', [project.id])).rows;
		for(const version of versionList) {
			console.log('  Inserting version ' + version.name);

			const [query, values] = QueryBuilder.buildInsertQuery('versions', ObjectConversion.RedmineVersionToOPVersion(version));
			await openProjectPool.query(query, values);
		}

		// Assign project roles
		await openProjectPool.query('INSERT INTO public.members(user_id, project_id, created_at, mail_notification, updated_at) VALUES ($1, $2, $3, $4, $5)',  [2 /* Default user */, project.id, DEFAULT_CREATED_DATE, false, DEFAULT_UPDATED_DATE]);
		const lastInsertedRow = (await openProjectPool.query('SELECT * FROM members WHERE project_id = $1', [project.id])).rows[0];
		await openProjectPool.query('INSERT INTO public.member_roles(member_id, role_id, inherited_from) VALUES ($1, $2, $3)',  [lastInsertedRow.id, 3 /* Project Admin */, null]);

		// Assign enabled_modules
		for(const moduleName of modules) {
			await openProjectPool.query('INSERT INTO enabled_modules(project_id, name) VALUES($1, $2)', [project.id, moduleName]);
		}
	}

	// Set sequence order
	const versionList = (await redminePool.query('SELECT * FROM versions ORDER BY id')).rows;
	if(versionList.length > 0) {
		await openProjectPool.query('SELECT setval(\'versions_id_seq\', $1, true);', [parseInt(versionList[versionList.length - 1].id) + 1]);
	} else {
		await openProjectPool.query('SELECT setval(\'versions_id_seq\', $1, true);', [1]);
	}

	if(projectList.length > 0) {
		await openProjectPool.query('SELECT setval(\'projects_id_seq\', $1, true);', [parseInt(projectList[projectList.length - 1].id) + 1]);
	} else {
		await openProjectPool.query('SELECT setval(\'projects_id_seq\', $1, true);', [1]);
	}

	// Activate all types on all projects
	console.log('Activate types on projects ...');
	const projectTypesAndTrackers = (await redminePool.query('SELECT * FROM projects_trackers')).rows;
	for(const projectTypesAndTracker of projectTypesAndTrackers) {
		const tracker = RedmineTrackersList.filter((elt) => elt.id == projectTypesAndTracker.tracker_id)[0];
		const type = OPTypesList.filter((elt) => elt.name === tracker.name)[0];

		await openProjectPool.query('INSERT INTO projects_types (project_id, type_id) VALUES ($1, $2)', [projectTypesAndTracker.project_id, type.id]);
	}
	console.log('Types on projects has been activated !');

	// Issues
	await openProjectPool.query('SELECT setval(\'relations_id_seq\', $1, true);', [1]);
	const issuesList = (await redminePool.query('SELECT * FROM issues ORDER BY id')).rows;
	console.log('Inserting issues ...');
	for(const issue of issuesList) {
		//console.log('Inserting issue #' + issue.id);
		const [query, values] = QueryBuilder.buildInsertQuery('work_packages', transformIssueObject(issue));
		await openProjectPool.query(query, values);

		if(issue.parent_id !== null && issue.parent_id != 0) {
			const [queryParent, valuesParent] = QueryBuilder.buildInsertQuery('relations', ObjectConversion.createParentRelationship(issue.id, issue.parent_id, 1));
			await openProjectPool.query(queryParent, valuesParent);
		}
	}
	console.log('Issues inserted !');

	// Set sequence order
	if(issuesList.length > 0) {
		await openProjectPool.query('SELECT setval(\'work_packages_id_seq\', $1, true);', [parseInt(issuesList[issuesList.length - 1].id) + 1]);
	} else {
		await openProjectPool.query('SELECT setval(\'work_packages_id_seq\', $1, true);', [1]);
	}

	// Time entries
	console.log('Inserting time_entries ...');
	const timeEntriesList = (await redminePool.query('SELECT * FROM time_entries ORDER BY id')).rows;
	for(const timeEntries of timeEntriesList) {
		//console.log('Inserting time_entries #' + timeEntries.id);
		const [query, values] = QueryBuilder.buildInsertQuery('time_entries', ObjectConversion.RedmineTimeEntriesToOPTimeEntries(timeEntries));
		await openProjectPool.query(query, values);
	}
	console.log('time_entries inserted !');

	// Set sequence order
	if(timeEntriesList.length > 0) {
		await openProjectPool.query('SELECT setval(\'time_entries_id_seq\', $1, true);', [parseInt(timeEntriesList[timeEntriesList.length - 1].id) + 1]);
	} else {
		await openProjectPool.query('SELECT setval(\'time_entries_id_seq\', $1, true);', [1]);
	}
})();