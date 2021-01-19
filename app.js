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

const DEFAULT_CREATED_DATE = new Date('2016-06-01');
const DEFAULT_UPDATED_DATE = new Date();

const priorities = {
	'Bas': 'Low',
	'Normal': 'Low',
	'Haut': 'Normal',
	'Urgent' : 'High',
	'Immédiat' : 'Immediate',
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
[X] "issue_statuses"
[ ] "import_items"
[/] "issues"
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
		//id: tracker.id, // DO NOT INSERT ID, there's already existing rows
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
		created_at: DEFAULT_CREATED_DATE,
		updated_at: DEFAULT_UPDATED_DATE,
		is_standard: false,
		attribute_groups: null,
		description: '',
	};
}

function transformStatusesObject(status) {
	return {
		//id: status.id, // DO NOT INSERT ID, there's already existing rows
		name: status.name,
		is_closed: status.is_closed,
		is_default: true,
		position: status.position,
		default_done_ratio: status.default_done_ratio,
		created_at: DEFAULT_CREATED_DATE,
		updated_at: DEFAULT_UPDATED_DATE,
		color_id: 1,
		is_readonly: false,
	};
}

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
		throw new Error('invalid redmine status "' + issue.priority_id + '".');
	}

	const openum = OPEnum.filter((elt) => elt.name === redenum.name)[0];
	if(typeof openum === 'undefined' || typeof openum.id === 'undefined') {
		throw new Error('invalid openproject status "' + issue.priority_id + '".');
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

function transformTimeEntriesObject(time_entries) {
	return {
		id: time_entries.id,
		project_id: time_entries.project_id,
		user_id: time_entries.user_id,
		work_package_id: time_entries.issue_id,
		hours: time_entries.hours,
		comments: time_entries.comments,
		activity_id: time_entries.activity_id,
		spent_on: time_entries.spent_on,
		tyear: time_entries.tyear,
		tmonth: time_entries.tmonth,
		tweek: time_entries.tweek,
		created_at: time_entries.created_on,
		updated_at: time_entries.updated_on,
		// ?: time_entries.author_id,
		overridden_costs: 0,
		costs: 0,
		rate_id: null,
	};
}

(async () => {
	/**
	 * Clean db
	 */
	console.log('Cleaning enabled_modules');
	await openProjectPool.query('DELETE FROM enabled_modules');

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
	RedmineEnum = (await openProjectPool.query('SELECT * FROM enumerations')).rows;

	/**
	 * Migrate data
	 */
	// Trackers
	RedmineTrackersList = (await redminePool.query('SELECT * FROM trackers')).rows;
	for(const RedmineTracker of RedmineTrackersList) {
		if((await openProjectPool.query('SELECT * FROM types WHERE name = $1', [RedmineTracker.name])).rows.length === 0) {
			console.log('Inserting tracker/type ' + RedmineTracker.name);
			const [query, values] = buildInsertQuery('types', transformTrackerObject(RedmineTracker));
			await openProjectPool.query(query, values);
		}
	}
	OPTypesList = (await openProjectPool.query('SELECT * FROM types')).rows;

	// Trackers
	RedmineStatusesList = (await redminePool.query('SELECT * FROM issue_statuses')).rows;
	for(const RedmineStatus of RedmineStatusesList) {
		if((await openProjectPool.query('SELECT * FROM statuses WHERE name = $1', [RedmineStatus.name])).rows.length === 0) {
			console.log('Inserting status ' + RedmineStatus.name);
			const [query, values] = buildInsertQuery('statuses', transformStatusesObject(RedmineStatus));
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

		const [query, values] = buildInsertQuery('projects', transformProjectObject(project));
		await openProjectPool.query(query, values);

		// Versions
		const versionList = (await redminePool.query('SELECT * FROM versions WHERE project_id = $1', [project.id])).rows;
		for(const version of versionList) {
			console.log('  Inserting version ' + version.name);

			const [query, values] = buildInsertQuery('versions', transformVersionObject(version));
			await openProjectPool.query(query, values);
		}

		// Assign project roles
		await openProjectPool.query('INSERT INTO public.members(user_id, project_id, created_at, mail_notification, updated_at) VALUES ($1, $2, $3, $4, $5)',  [2 /* Default user */, project.id, DEFAULT_CREATED_DATE, false, DEFAULT_UPDATED_DATE]);
		const lastInsertedRow = (await openProjectPool.query('SELECT * FROM members WHERE project_id = $1', [project.id])).rows[0];
		await openProjectPool.query('INSERT INTO public.member_roles(member_id, role_id, inherited_from) VALUES ($1, $2, $3)',  [lastInsertedRow.id, 3 /* Project Admin */, null]);

		// Assign enabled_modules
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
	console.log('Activate all types on all projects ...');
	for(const project of projectList) {
		for(const types of OPTypesList) {
			//console.log('Inserting (' + project.id + ', ' + types.id + ')');
			await openProjectPool.query('INSERT INTO projects_types (project_id, type_id) VALUES ($1, $2)', [project.id, types.id]);
		}
	}
	console.log('All types on all projects has been activated !');

	// Issues
	const issuesList = (await redminePool.query('SELECT * FROM issues ORDER BY id')).rows;
	console.log('Inserting issues ...');
	for(const issue of issuesList) {
		//console.log('Inserting issue #' + issue.id);
		const [query, values] = buildInsertQuery('work_packages', transformIssueObject(issue));
		await openProjectPool.query(query, values);
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
		const [query, values] = buildInsertQuery('time_entries', transformTimeEntriesObject(timeEntries));
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