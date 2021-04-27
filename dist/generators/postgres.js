"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _schemaGenerator = _interopRequireDefault(require("../schema-generator"));

var _util = require("util");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// This function is required in the database

/*
DROP FUNCTION IF EXISTS FCM_ConvertToFloat(input_value text);
CREATE OR REPLACE FUNCTION FCM_ConvertToFloat(input_value text)
  RETURNS double precision AS
$BODY$
DECLARE float_value double precision DEFAULT NULL;
BEGIN
  BEGIN
    float_value := input_value::double precision;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
RETURN float_value;
END;
$BODY$
LANGUAGE 'plpgsql' IMMUTABLE STRICT;
*/
const TYPES = {
  pk: 'bigserial NOT NULL',
  string: 'text',
  integer: 'bigint',
  date: 'date',
  time: 'time without time zone',
  double: 'double precision',
  timestamp: 'timestamp with time zone',
  geometry: 'geometry(Geometry, 4326)',
  json: 'text',
  array: 'text[]',
  boolean: 'boolean',
  fts: 'tsvector'
};

class Postgres extends _schemaGenerator.default {
  typeForColumn(column) {
    return TYPES[column.type] || 'text';
  }

  transformToText(columnName) {
    return (0, _util.format)('CAST(%s AS text)', columnName);
  } // alternate:
  // select '-1.2e10' ~ '^[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?$';


  transformToDouble(columnName) {
    return (0, _util.format)('FCM_ConvertToFloat(%s)', columnName);
  }

  transformToDate(columnName) {
    return (0, _util.format)('FCM_ConvertToDate(%s)', columnName);
  }

  primaryKeyName(table) {
    return this.escape(this.tablePrefix + table.name + '_pkey');
  }

  primaryKeySequenceName(table) {
    return this.escape(this.tablePrefix + table.name + '_id_seq');
  }

  primaryKey(table) {
    if (table.columns[0].type === 'pk') {
      return (0, _util.format)('CONSTRAINT %s PRIMARY KEY (%s)', this.primaryKeyName(table), table.columns[0].name);
    }

    return '';
  }

  primarySequenceKey(table) {
    if (table.columns[0].type === 'pk') {
      return (0, _util.format)('CONSTRAINT %s PRIMARY KEY (%s)', this.primaryKeyName(table), table.columns[0].name);
    }

    return '';
  }

  createTable(change) {
    return (0, _util.format)('CREATE TABLE IF NOT EXISTS %s (\n  %s\n);', this.tableName(change.newTable), this.columnsForTable(change.newTable).concat(this.primaryKey(change.newTable)).join(',\n  '));
  }

  createIndex(change) {
    const method = change.method || 'btree';
    const indexName = this.indexName(change.newTable, change.columns);
    const tableName = this.tableName(change.newTable);
    const columns = change.columns.join(', ');
    const unique = change.unique ? 'UNIQUE ' : '';
    const withClause = method === 'gin' ? ' WITH (fastupdate = off)' : '';
    return (0, _util.format)('CREATE %sINDEX %s ON %s USING %s (%s)%s;', unique, indexName, tableName, method, columns, withClause);
  }

  dropView(change) {
    return (0, _util.format)('DROP VIEW IF EXISTS %s CASCADE;', this.viewName(change.oldView));
  }

  dropTable(change) {
    return (0, _util.format)('DROP TABLE IF EXISTS %s%s CASCADE;', this.escapedSchema(), this.escape(this.tablePrefix + change.oldTable.name));
  }

  renameTable(change) {
    const parts = [super.renameTable(change)];
    parts.push((0, _util.format)('ALTER TABLE %s RENAME CONSTRAINT %s TO %s;', this.tableName(change.newTable), this.primaryKeyName(change.oldTable), this.primaryKeyName(change.newTable)));
    parts.push((0, _util.format)('ALTER SEQUENCE %s RENAME TO %s;', this.escapedSchema() + this.primaryKeySequenceName(change.oldTable), this.primaryKeySequenceName(change.newTable)));
    return parts;
  }

  createView(change) {
    const viewName = this.viewName(change.newView);
    const tableName = this.tableName(change.newView.table);
    const viewDefinition = this.projectionForView(change.newView);
    const clause = change.newView.clause ? ' ' + change.newView.clause : '';
    return (0, _util.format)('CREATE OR REPLACE VIEW %s AS\nSELECT\n  %s\nFROM %s%s;', viewName, viewDefinition.join(',\n  '), tableName, clause);
  }

  insertInto(into, from) {
    const parts = [super.insertInto(into, from)];
    parts.push((0, _util.format)("SELECT setval('%s', (SELECT MAX(id) FROM %s));", this.escapedSchema() + this.primaryKeySequenceName(into), this.tableName(into)));
    return parts;
  }

}

exports.default = Postgres;
//# sourceMappingURL=postgres.js.map