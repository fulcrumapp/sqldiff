"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _schemaGenerator = _interopRequireDefault(require("../schema-generator"));

var _util = require("util");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

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
var TYPES = {
  pk: 'bigserial NOT NULL',
  string: 'text',
  integer: 'bigint',
  date: 'date',
  time: 'time without time zone',
  "double": 'double precision',
  timestamp: 'timestamp with time zone',
  geometry: 'geometry(Geometry, 4326)',
  json: 'text',
  array: 'text[]',
  "boolean": 'boolean',
  fts: 'tsvector'
};

var Postgres = /*#__PURE__*/function (_SchemaGenerator) {
  _inheritsLoose(Postgres, _SchemaGenerator);

  function Postgres() {
    return _SchemaGenerator.apply(this, arguments) || this;
  }

  var _proto = Postgres.prototype;

  _proto.typeForColumn = function typeForColumn(column) {
    return TYPES[column.type] || 'text';
  };

  _proto.transformToText = function transformToText(columnName) {
    return (0, _util.format)('CAST(%s AS text)', columnName);
  } // alternate:
  // select '-1.2e10' ~ '^[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?$';
  ;

  _proto.transformToDouble = function transformToDouble(columnName) {
    return (0, _util.format)('FCM_ConvertToFloat(%s)', columnName);
  };

  _proto.transformToDate = function transformToDate(columnName) {
    return (0, _util.format)('FCM_ConvertToDate(%s)', columnName);
  };

  _proto.primaryKeyName = function primaryKeyName(table) {
    return this.escape(this.tablePrefix + table.name + '_pkey');
  };

  _proto.primaryKeySequenceName = function primaryKeySequenceName(table) {
    return this.escape(this.tablePrefix + table.name + '_id_seq');
  };

  _proto.primaryKey = function primaryKey(table) {
    if (table.columns[0].type === 'pk') {
      return (0, _util.format)('CONSTRAINT %s PRIMARY KEY (%s)', this.primaryKeyName(table), table.columns[0].name);
    }

    return '';
  };

  _proto.primarySequenceKey = function primarySequenceKey(table) {
    if (table.columns[0].type === 'pk') {
      return (0, _util.format)('CONSTRAINT %s PRIMARY KEY (%s)', this.primaryKeyName(table), table.columns[0].name);
    }

    return '';
  };

  _proto.createTable = function createTable(change) {
    return (0, _util.format)('CREATE TABLE IF NOT EXISTS %s (\n  %s\n);', this.tableName(change.newTable), this.columnsForTable(change.newTable).concat(this.primaryKey(change.newTable)).join(',\n  '));
  };

  _proto.createIndex = function createIndex(change) {
    var method = change.method || 'btree';
    var indexName = this.indexName(change.newTable, change.columns);
    var tableName = this.tableName(change.newTable);
    var columns = change.columns.join(', ');
    var unique = change.unique ? 'UNIQUE ' : '';
    var withClause = method === 'gin' ? ' WITH (fastupdate = off)' : '';
    return (0, _util.format)('CREATE %sINDEX %s ON %s USING %s (%s)%s;', unique, indexName, tableName, method, columns, withClause);
  };

  _proto.dropView = function dropView(change) {
    return (0, _util.format)('DROP VIEW IF EXISTS %s CASCADE;', this.viewName(change.oldView));
  };

  _proto.dropTable = function dropTable(change) {
    return (0, _util.format)('DROP TABLE IF EXISTS %s%s CASCADE;', this.escapedSchema(), this.escape(this.tablePrefix + change.oldTable.name));
  };

  _proto.renameTable = function renameTable(change) {
    var parts = [_SchemaGenerator.prototype.renameTable.call(this, change)];
    parts.push((0, _util.format)('ALTER TABLE %s RENAME CONSTRAINT %s TO %s;', this.tableName(change.newTable), this.primaryKeyName(change.oldTable), this.primaryKeyName(change.newTable)));
    parts.push((0, _util.format)('ALTER SEQUENCE %s RENAME TO %s;', this.escapedSchema() + this.primaryKeySequenceName(change.oldTable), this.primaryKeySequenceName(change.newTable)));
    return parts;
  };

  _proto.createView = function createView(change) {
    var viewName = this.viewName(change.newView);
    var tableName = this.tableName(change.newView.table);
    var viewDefinition = this.projectionForView(change.newView);
    var clause = change.newView.clause ? ' ' + change.newView.clause : '';
    return (0, _util.format)('CREATE OR REPLACE VIEW %s AS\nSELECT\n  %s\nFROM %s%s;', viewName, viewDefinition.join(',\n  '), tableName, clause);
  };

  _proto.insertInto = function insertInto(into, from) {
    var parts = [_SchemaGenerator.prototype.insertInto.call(this, into, from)];
    parts.push((0, _util.format)("SELECT setval('%s', (SELECT MAX(id) FROM %s));", this.escapedSchema() + this.primaryKeySequenceName(into), this.tableName(into)));
    return parts;
  };

  return Postgres;
}(_schemaGenerator["default"]);

exports["default"] = Postgres;
//# sourceMappingURL=postgres.js.map