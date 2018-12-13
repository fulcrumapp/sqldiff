'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _schemaGenerator = require('../schema-generator');

var _schemaGenerator2 = _interopRequireDefault(_schemaGenerator);

var _util = require('util');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

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
  double: 'double precision',
  timestamp: 'timestamp with time zone',
  geometry: 'geometry(Geometry, 4326)',
  json: 'text',
  array: 'text[]',
  boolean: 'boolean',
  fts: 'tsvector'
};

var Postgres = function (_SchemaGenerator) {
  _inherits(Postgres, _SchemaGenerator);

  function Postgres() {
    _classCallCheck(this, Postgres);

    return _possibleConstructorReturn(this, (Postgres.__proto__ || Object.getPrototypeOf(Postgres)).apply(this, arguments));
  }

  _createClass(Postgres, [{
    key: 'typeForColumn',
    value: function typeForColumn(column) {
      return TYPES[column.type] || 'text';
    }
  }, {
    key: 'transformToText',
    value: function transformToText(columnName) {
      return (0, _util.format)('CAST(%s AS text)', columnName);
    }

    // alternate:
    // select '-1.2e10' ~ '^[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?$';

  }, {
    key: 'transformToDouble',
    value: function transformToDouble(columnName) {
      return (0, _util.format)('FCM_ConvertToFloat(%s)', columnName);
    }
  }, {
    key: 'transformToDate',
    value: function transformToDate(columnName) {
      return (0, _util.format)('FCM_ConvertToDate(%s)', columnName);
    }
  }, {
    key: 'primaryKeyName',
    value: function primaryKeyName(table) {
      return this.escape(this.tablePrefix + table.name + '_pkey');
    }
  }, {
    key: 'primaryKeySequenceName',
    value: function primaryKeySequenceName(table) {
      return this.escape(this.tablePrefix + table.name + '_id_seq');
    }
  }, {
    key: 'primaryKey',
    value: function primaryKey(table) {
      if (table.columns[0].type === 'pk') {
        return (0, _util.format)('CONSTRAINT %s PRIMARY KEY (%s)', this.primaryKeyName(table), table.columns[0].name);
      }

      return '';
    }
  }, {
    key: 'primarySequenceKey',
    value: function primarySequenceKey(table) {
      if (table.columns[0].type === 'pk') {
        return (0, _util.format)('CONSTRAINT %s PRIMARY KEY (%s)', this.primaryKeyName(table), table.columns[0].name);
      }

      return '';
    }
  }, {
    key: 'createTable',
    value: function createTable(change) {
      return (0, _util.format)('CREATE TABLE IF NOT EXISTS %s (\n  %s\n);', this.tableName(change.newTable), this.columnsForTable(change.newTable).concat(this.primaryKey(change.newTable)).join(',\n  '));
    }
  }, {
    key: 'createIndex',
    value: function createIndex(change) {
      var method = change.method || 'btree';
      var indexName = this.indexName(change.newTable, change.columns);
      var tableName = this.tableName(change.newTable);
      var columns = change.columns.join(', ');
      var unique = change.unique ? 'UNIQUE ' : '';
      var withClause = method === 'gin' ? ' WITH (fastupdate = off)' : '';

      return (0, _util.format)('CREATE %sINDEX %s ON %s USING %s (%s)%s;', unique, indexName, tableName, method, columns, withClause);
    }
  }, {
    key: 'dropView',
    value: function dropView(change) {
      return (0, _util.format)('DROP VIEW IF EXISTS %s CASCADE;', this.viewName(change.oldView));
    }
  }, {
    key: 'dropTable',
    value: function dropTable(change) {
      return (0, _util.format)('DROP TABLE IF EXISTS %s%s CASCADE;', this.escapedSchema(), this.escape(this.tablePrefix + change.oldTable.name));
    }
  }, {
    key: 'renameTable',
    value: function renameTable(change) {
      var parts = [_get(Postgres.prototype.__proto__ || Object.getPrototypeOf(Postgres.prototype), 'renameTable', this).call(this, change)];

      parts.push((0, _util.format)('ALTER TABLE %s RENAME CONSTRAINT %s TO %s;', this.tableName(change.newTable), this.primaryKeyName(change.oldTable), this.primaryKeyName(change.newTable)));

      parts.push((0, _util.format)('ALTER SEQUENCE %s RENAME TO %s;', this.escapedSchema() + this.primaryKeySequenceName(change.oldTable), this.primaryKeySequenceName(change.newTable)));

      return parts;
    }
  }, {
    key: 'createView',
    value: function createView(change) {
      var viewName = this.viewName(change.newView);
      var tableName = this.tableName(change.newView.table);
      var viewDefinition = this.projectionForView(change.newView);
      var clause = change.newView.clause ? ' ' + change.newView.clause : '';

      return (0, _util.format)('CREATE OR REPLACE VIEW %s AS\nSELECT\n  %s\nFROM %s%s;', viewName, viewDefinition.join(',\n  '), tableName, clause);
    }
  }, {
    key: 'insertInto',
    value: function insertInto(into, from) {
      var parts = [_get(Postgres.prototype.__proto__ || Object.getPrototypeOf(Postgres.prototype), 'insertInto', this).call(this, into, from)];

      parts.push((0, _util.format)("SELECT setval('%s', (SELECT MAX(id) FROM %s));", this.escapedSchema() + this.primaryKeySequenceName(into), this.tableName(into)));

      return parts;
    }
  }]);

  return Postgres;
}(_schemaGenerator2.default);

exports.default = Postgres;
//# sourceMappingURL=postgres.js.map