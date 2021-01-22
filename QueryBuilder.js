export default class QueryBuilder {
	static buildUpdateQuery(table, fields) {
		let query = 'UPDATE "' + table + '" SET';
		const values = [];

		for(const key in fields) {
			values.push(fields[key]);
			query += ' "' + key + '" = $' + values.length + ',';
		}

		query = query.substr(0, query.length-1);

		return [query, values];
	}

	static buildInsertQuery(table, fields) {
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
}
