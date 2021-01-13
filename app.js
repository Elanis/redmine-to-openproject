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
	};
}

(async () => {
	// Projects
	const redmineProjects = (await redminePool.query('SELECT * FROM projects')).rows;

	console.log('Cleaning projects');
	await openProjectPool.query('DELETE FROM projects');

	for(const project of redmineProjects) {
		console.log('Inserting project ' + project.name);

		const [query, values] = buildInsertQuery('projects', transformProjectObject(project));
		await openProjectPool.query(query, values);
	}
})();