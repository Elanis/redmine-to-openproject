import ObjectConversion from './ObjectConversion.js';
import QueryBuilder from './QueryBuilder.js';

export default class MigrationFn {
	static async cleanup() {
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

		console.log('Cleaning users');
		await openProjectPool.query('DELETE FROM user_preferences WHERE id > 3'); // Only keep System, Admin and Anonymous
		await openProjectPool.query('DELETE FROM user_passwords WHERE id > 3'); // Only keep System, Admin and Anonymous
		await openProjectPool.query('DELETE FROM users WHERE id > 3'); // Only keep System, Admin and Anonymous

		console.log('Cleaning wikis');
		await openProjectPool.query('DELETE FROM wiki_redirects');
		await openProjectPool.query('DELETE FROM wiki_pages');
		await openProjectPool.query('DELETE FROM wiki_contents');
		await openProjectPool.query('DELETE FROM wiki_content_journals');
		await openProjectPool.query('DELETE FROM wikis');
	}

	static async users() {
		console.log('Inserting users');
		const RedmineUsersList = (await redminePool.query('SELECT * FROM users')).rows;
		const RedmineEmailAddresses = (await redminePool.query('SELECT * FROM email_addresses')).rows;
		for(const RedmineUser of RedmineUsersList) {
			if(RedmineUser.id <= 4) {
				continue; // Skip system users
			}

			const [query, values] = QueryBuilder.buildInsertQuery('users', ObjectConversion.RedmineUserToOpenProjectUser(RedmineUser, RedmineEmailAddresses.filter((elt) => elt.user_id === RedmineUser.id)[0].address));
			await openProjectPool.query(query, values);

			const [query2, values2] = QueryBuilder.buildInsertQuery('user_passwords', ObjectConversion.RedmineUserToOpenProjectUserPassword(RedmineUser));
			await openProjectPool.query(query2, values2);

			await openProjectPool.query('SELECT setval(\'users_id_seq\', $1, true);', [RedmineUser.id]);
			await openProjectPool.query('SELECT setval(\'user_passwords_id_seq\', $1, true);', [RedmineUser.id]);
		}

		const RedmineUserPreferences = (await redminePool.query('SELECT * FROM user_preferences')).rows;
		for(const RedmineUserPreference of RedmineUserPreferences) {
			if(RedmineUserPreference.id <= 4) {
				continue; // Skip system users
			}

			const [query, values] = QueryBuilder.buildInsertQuery('user_preferences', RedmineUserPreference); // No need to transform here
			await openProjectPool.query(query, values);

			await openProjectPool.query('SELECT setval(\'user_preferences_id_seq\', $1, true);', [RedmineUserPreference.id]);
		}
	}

	static async trackers() {
		console.log('Inserting trackers');
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
	}

	static async statuses() {
		console.log('Inserting statuses');
		// Statuses
		RedmineStatusesList = (await redminePool.query('SELECT * FROM issue_statuses')).rows;
		for(const RedmineStatus of RedmineStatusesList) {
			if((await openProjectPool.query('SELECT * FROM statuses WHERE name = $1', [RedmineStatus.name])).rows.length === 0) {
				console.log('Inserting status ' + RedmineStatus.name);
				const [query, values] = QueryBuilder.buildInsertQuery('statuses', ObjectConversion.RedmineIssueStatusToOPStatus(RedmineStatus));
				await openProjectPool.query(query, values);
			}
		}
		OPStatusesList = (await openProjectPool.query('SELECT * FROM statuses')).rows;
	}

	static async projects() {
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

			let userId = 2; // Default user because redmine doesn't have

			// Assign enabled_modules
			for(const moduleName of modules) {
				await openProjectPool.query('INSERT INTO enabled_modules(project_id, name) VALUES($1, $2)', [project.id, moduleName]);
			}
		}

		// Assign project roles
		const RedmineMembers = (await redminePool.query('SELECT * FROM members')).rows;
		for(const RedmineMember of RedmineMembers) {
			let userId = RedmineMember.user_id;

			// Admin account
			if(userId == 1) {
				userId = 2;
			}

			await openProjectPool.query(
				'INSERT INTO public.members(id, user_id, project_id, created_at, mail_notification, updated_at) VALUES ($1, $2, $3, $4, $5, $6)', 
				[RedmineMember.id, userId, RedmineMember.project_id, RedmineMember.created_on, false, RedmineMember.created_on ]
			);
		}

		const RedmineMemberRoles = (await redminePool.query('SELECT * FROM member_roles')).rows;
		for(const RedmineMemberRole of RedmineMemberRoles) {
			await openProjectPool.query(
				'INSERT INTO public.member_roles(id, member_id, role_id, inherited_from) VALUES ($1, $2, $3, $4)',
				[RedmineMemberRole.id, RedmineMemberRole.member_id, RedmineMemberRole.role_id, RedmineMemberRole.inherited_from]);
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
	}

	static async issues() {
		await openProjectPool.query('SELECT setval(\'relations_id_seq\', $1, true);', [1]);
		const issuesList = (await redminePool.query('SELECT * FROM issues ORDER BY id')).rows;
		console.log('Inserting issues ...');
		for(const issue of issuesList) {
			//console.log('Inserting issue #' + issue.id);
			const [query, values] = QueryBuilder.buildInsertQuery('work_packages', ObjectConversion.transformIssueObject(issue));
			await openProjectPool.query(query, values);

			const [queryRelToItself, valuesRelToItself] = QueryBuilder.buildInsertQuery('relations', ObjectConversion.createParentRelationship(issue.id, issue.id, 0));
			await openProjectPool.query(queryRelToItself, valuesRelToItself);

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
	}

	static async timeEntries() {
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
	}

	static async wiki() {
		console.log('Inserting wikis ...');

		// wikis
		for(const wiki of (await redminePool.query('SELECT * FROM wikis')).rows) {
			const [query, values] = QueryBuilder.buildInsertQuery('wikis', {
				...wiki,
				created_at: DEFAULT_CREATED_DATE,
				updated_at: DEFAULT_UPDATED_DATE
			});
			await openProjectPool.query(query, values);
		}

		// wiki_redirects
		for(const wiki_redirect of (await redminePool.query('SELECT * FROM wiki_redirects')).rows) {
			wiki_redirect.created_at = wiki_redirect.created_on;
			delete wiki_redirect.created_on;

			const [query, values] = QueryBuilder.buildInsertQuery('wiki_redirects', {
				...wiki_redirect,
				redirects_to_wiki_id: wiki_redirect.id,
			});
			await openProjectPool.query(query, values);
		}

		// wiki_pages
		for(const wiki_page of (await redminePool.query('SELECT * FROM wiki_pages')).rows) {
			wiki_page.created_at = wiki_page.created_on;
			delete wiki_page.created_on;

			const [query, values] = QueryBuilder.buildInsertQuery('wiki_pages', {
				...wiki_page,
				slug: wiki_page.title.replaceAll(' ', '-').toLowerCase(),
				updated_at: DEFAULT_UPDATED_DATE
			});
			await openProjectPool.query(query, values);
		}

		// wiki_contents
		for(const wiki_content of (await redminePool.query('SELECT * FROM wiki_contents')).rows) {
			wiki_content.updated_at = wiki_content.updated_on;
			delete wiki_content.updated_on;

			wiki_content.lock_version = wiki_content.version;
			delete wiki_content.version;

			wiki_content.comments = '';

			const [query, values] = QueryBuilder.buildInsertQuery('wiki_contents', wiki_content);
			await openProjectPool.query(query, values);
		}

		// wiki_content_versions
		for(const wiki_content_versions of (await redminePool.query('SELECT * FROM wiki_content_versions')).rows) {
			const [query, values] = QueryBuilder.buildInsertQuery('wiki_content_versions', {
				id: wiki_content_versions.id,
				journal_id: wiki_content_versions.wiki_content_id,
				page_id: wiki_content_versions.page_id,
				author_id: wiki_content_versions.author_id,
				text: wiki_content_versions.data
			});
			await openProjectPool.query(query, values);
		}
	}
}