"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _schemaGenerator = _interopRequireDefault(require("../schema-generator"));

var _util = require("util");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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

class SQLite extends _schemaGenerator.default {
  typeForColumn(column) {
    return TYPES[column.type] || 'TEXT';
  }

  transformToText(columnName) {
    return (0, _util.format)('CAST(%s AS text)', columnName);
  }

  transformToDate(columnName) {
    return this.transformToText(columnName);
  }

  transformToDouble(columnName) {
    return (0, _util.format)('(CASE ' + 'WHEN LENGTH(TRIM(%s)) = 0 THEN NULL ' + 'WHEN CAST(%s AS REAL) = 0 AND ' + "LENGTH(TRIM(REPLACE(REPLACE(REPLACE(%s, '.', ''), '0', ' '), '-', ''))) > 0 THEN NULL " + 'ELSE CAST(%s AS REAL) ' + 'END)', columnName, columnName, columnName, columnName);
  }

  createIndex(change) {
    const unique = change.unique ? 'UNIQUE ' : '';
    return (0, _util.format)('CREATE %sINDEX IF NOT EXISTS %s ON %s (%s);', unique, this.indexName(change.newTable, change.columns), this.tableName(change.newTable), change.columns.join(', '));
  }

  escape(identifier) {
    if (identifier == null || identifier.length === 0) {
      return '';
    }

    return '`' + identifier + '`';
  }

}

exports.default = SQLite;
//# sourceMappingURL=sqlite.js.map