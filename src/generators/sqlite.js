import SchemaGenerator from '../schema-generator';
import { format as fmt} from 'util';

const TYPES = {
  pk: 'INTEGER PRIMARY KEY AUTOINCREMENT',
  string: 'TEXT',
  integer: 'INTEGER',
  date: 'REAL',
  time: 'REAL',
  double: 'REAL',
  array: 'TEXT',
  json: 'TEXT',
  boolean: 'INTEGER',
  timestamp: 'REAL'
};

export default class SQLite extends SchemaGenerator {
  typeForColumn(column) {
    return TYPES[column.type] || 'TEXT';
  }

  transformToText(columnName) {
    return fmt('CAST(%s AS text)', columnName);
  }

  transformToDate(columnName) {
    return this.transformToText(columnName);
  }

  transformToDouble(columnName) {
    return fmt(
      '(CASE ' +
      'WHEN LENGTH(TRIM(%s)) = 0 THEN NULL ' +
      'WHEN CAST(%s AS REAL) = 0 AND ' +
      "LENGTH(TRIM(REPLACE(REPLACE(REPLACE(%s, '.', ''), '0', ' '), '-', ''))) > 0 THEN NULL " +
      'ELSE CAST(%s AS REAL) ' +
      'END)',
      columnName, columnName, columnName, columnName
    );
  }

  createIndex(change) {
    const unique = change.unique ? 'UNIQUE ' : '';

    return fmt(
      'CREATE %sINDEX IF NOT EXISTS %s ON %s (%s);',
      unique,
      this.indexName(change.newTable, change.columns),
      this.tableName(change.newTable),
      change.columns.join(', ')
    );
  }

  escape(identifier) {
    if (identifier == null || identifier.length === 0) {
      return '';
    }

    return '`' + identifier + '`';
  }
}
