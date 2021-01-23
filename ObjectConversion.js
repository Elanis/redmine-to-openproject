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
			// ?: project.homepage,
			// ?: project.status,
			// ?: project.inherit_members,
			// ?: project.default_version_id,
			// ?: project.default_assigned_to_id,
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
			// ?: version.start_date,
		};
	}

	static RedmineTrackerToOPType(tracker) {
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
			// ?: time_entries.author_id,
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
}
