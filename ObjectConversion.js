export default class ObjectConversion {
	static RedmineProjectToOPProject(project) {
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
			// ?: project.homepage, // @TODO
			// ?: project.status, // @TODO
			// ?: project.inherit_members, // @TODO
			// ?: project.default_version_id, // @TODO
			// ?: project.default_assigned_to_id, // @TODO
		};
	}

	static RedmineVersionToOPVersion(version) {
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
			start_date: version.start_date,
		};
	}

	static RedmineTrackerToOPType(tracker) {
		return {
			//id: tracker.id, // DO NOT INSERT ID, there's already existing rows
			name: tracker.name,
			// ?: tracker.is_in_chlog, // @TODO
			position: tracker.position,
			is_in_roadmap: tracker.is_in_roadmap,
			is_milestone: false,
			is_default: true,
			color_id: 1,
			// ?: tracker.fields_bits, // @TODO
			// ?: tracker.default_status_id, // @TODO
			// ?: tracker.description, // @TODO
			created_at: DEFAULT_CREATED_DATE,
			updated_at: DEFAULT_UPDATED_DATE,
			is_standard: false,
			attribute_groups: null,
			description: '',
		};
	}

	static RedmineIssueStatusToOPStatus(status) {
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

	static RedmineTimeEntriesToOPTimeEntries(time_entries) {
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
			// ?: time_entries.author_id, // Author is user_id
			overridden_costs: 0,
			costs: 0,
			rate_id: null,
		};
	}

	static createParentRelationship(issueId, parentId, hierarchy) {
		return {
			//id: ?, // DO NOT INSERT ID, there's already existing rows
			from_id: parentId,
			to_id: issueId,
			delay: null,
			description: null,
			hierarchy,
			relates: 0,
			duplicates: 0,
			blocks: 0,
			follows: 0,
			includes: 0,
			requires: 0,
			count: 1,
		};
	}

	static RedmineUserToOpenProjectUser(user, mail) {
		/*
		hashed_password, => Table "user_passwords"
		salt, => Table "user_passwords"
		passwd_changed_on => Table "user_passwords"
		*/

		return {
			id: user.id,
			login: user.login,
			firstname: user.firstname,
			lastname: user.lastname,
			mail,
			admin: user.admin,
			status: user.status,
			last_login_on: user.last_login_on,
			language: user.language,
			auth_source_id: user.auth_source_id, // @TODO: migrate auth_source table
			created_at: user.created_on,
			updated_at: user.updated_on,
			type: user.type,
			identity_url: user.identity_url,
			mail_notification: user.mail_notification,
			first_login: true,
			force_password_change: user.must_change_passwd,
			failed_login_count: 0, // Not existing on redmine
			last_failed_login_on: null, // Not existing on redmine
			consented_at: null, // Not existing on redmine
		};
	}

	static RedmineUserToOpenProjectUserPassword(user) {
		/*
		hashed_password, => Table "user_passwords"
		salt, => Table "user_passwords"
		passwd_changed_on => Table "user_passwords"
		*/

		return {
			id: user.id,
			user_id: user.id,
			hashed_password: user.hashed_password,
			salt: user.salt,
			created_at: user.passwd_changed_on,
			updated_at: user.passwd_changed_on,
			type: 'UserPassword::SHA1'
		};
	}
}
