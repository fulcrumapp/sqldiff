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

var TYPES = {
  pk: 'bigint NOT NULL IDENTITY(1,1) PRIMARY KEY',
  string: 'varchar(max)',
  integer: 'bigint',
  date: 'date',
  time: 'time',
  "double": 'float',
  timestamp: 'datetime',
  geometry: 'geography',
  json: 'varchar(max)',
  array: 'varchar(max)',
  "boolean": 'bit',
  fts: 'varchar(max)'
};

var MSSQL = /*#__PURE__*/function (_SchemaGenerator) {
  _inheritsLoose(MSSQL, _SchemaGenerator);

  function MSSQL() {
    return _SchemaGenerator.apply(this, arguments) || this;
  }

  var _proto = MSSQL.prototype;

  _proto.escape = function escape(identifier) {
    if (identifier == null || identifier.length === 0) {
      return '';
    }

    return '[' + identifier + ']';
  };

  _proto.unescape = function unescape(identifier) {
    return identifier.replace(/[[\]]/g, '');
  };

  _proto.typeForColumn = function typeForColumn(column) {
    if (column.type === 'string') {
      if (/_id$/.test(column.name) || column.length != null) {
        return 'varchar(' + (column.length || '100') + ')';
      }
    }

    return TYPES[column.type] || 'varchar(max)';
  };

  _proto.transformToText = function transformToText(columnName) {
    return (0, _util.format)('CAST(%s AS varchar(max))', columnName);
  };

  _proto.transformToDouble = function transformToDouble(columnName) {
    return (0, _util.format)('TRY_PARSE(%s AS float)', columnName);
  };

  _proto.transformToDate = function transformToDate(columnName) {
    return (0, _util.format)('TRY_CAST(%s AS date)', columnName);
  };

  _proto.createTable = function createTable(change) {
    return (0, _util.format)('CREATE TABLE %s (\n  %s\n);', this.tableName(change.newTable), this.columnsForTable(change.newTable).join(',\n  '));
  };

  _proto.addColumn = function addColumn(change) {
    return (0, _util.format)('ALTER TABLE %s ADD %s;', this.tableName(change.newTable), this.columnDefinition(change.column));
  };

  _proto.createView = function createView(change) {
    var whereClause = '';

    if (change.newView.filter) {
      var parts = [];

      for (var _i = 0, _Object$keys = Object.keys(change.newView.filter); _i < _Object$keys.length; _i++) {
        var field = _Object$keys[_i];
        parts.push(this.escape(field) + " = '" + change.newView.filter[field] + "'");
      }

      whereClause = ' WHERE ' + parts.join(' AND ');
    }

    return (0, _util.format)('CREATE VIEW %s AS\nSELECT\n  %s\nFROM %s%s;', this.viewName(change.newView), this.projectionForView(change.newView).join(',\n  '), this.tableName(change.newView.table), whereClause);
  };

  _proto.createIndex = function createIndex(change) {
    var _this = this;

    var method = change.method || 'btree';
    var indexName = this.indexName(change.newTable, change.columns);
    var tableName = this.tableName(change.newTable);
    var columns = change.columns.map(function (c) {
      return _this.escape(c);
    }).join(', ');
    var unique = change.unique ? 'UNIQUE ' : '';
    var spatial = method === 'spatial' ? ' SPATIAL' : '';
    return (0, _util.format)('CREATE%s %sINDEX %s ON %s (%s);', spatial, unique, indexName, tableName, columns);
  };

  _proto.dropView = function dropView(change) {
    return (0, _util.format)("IF OBJECT_ID('%s%s', 'V') IS NOT NULL DROP VIEW %s%s;", this.escapedSchema(), this.escape(this.tablePrefix + change.oldView.name), this.escapedSchema(), this.escape(this.tablePrefix + change.oldView.name));
  };

  _proto.dropTable = function dropTable(change) {
    return (0, _util.format)("IF OBJECT_ID('%s%s', 'U') IS NOT NULL DROP TABLE %s%s;", this.escapedSchema(), this.escape(this.tablePrefix + change.oldTable.name), this.escapedSchema(), this.escape(this.tablePrefix + change.oldTable.name));
  };

  _proto.renameTable = function renameTable(change) {
    return (0, _util.format)('EXEC sp_rename \'%s\', \'%s\', \'OBJECT\';', this.unescape(this.tableName(change.oldTable)), this.tablePrefix + change.newTable.name);
  };

  _proto.renameColumn = function renameColumn(change) {
    return (0, _util.format)('EXEC sp_rename \'%s\', \'%s\', \'COLUMN\';', [this.unescape(this.tableName(change.newTable)), change.oldColumn.name].join('.'), change.newColumn.name);
  };

  _proto.insertInto = function insertInto(into, from) {
    var parts = [(0, _util.format)('SET IDENTITY_INSERT %s ON;', this.tableName(into)), _SchemaGenerator.prototype.insertInto.call(this, into, from), (0, _util.format)('SET IDENTITY_INSERT %s OFF;', this.tableName(into)), (0, _util.format)('DBCC CHECKIDENT (\'%s\');', this.tableName(into))];
    return parts;
  };

  return MSSQL;
}(_schemaGenerator["default"]);

exports["default"] = MSSQL;
//# sourceMappingURL=mssql.js.map