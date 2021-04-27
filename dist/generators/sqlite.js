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
  pk: 'INTEGER PRIMARY KEY AUTOINCREMENT',
  string: 'TEXT',
  integer: 'INTEGER',
  date: 'REAL',
  time: 'REAL',
  "double": 'REAL',
  array: 'TEXT',
  json: 'TEXT',
  "boolean": 'INTEGER',
  timestamp: 'REAL'
};

var SQLite = /*#__PURE__*/function (_SchemaGenerator) {
  _inheritsLoose(SQLite, _SchemaGenerator);

  function SQLite() {
    return _SchemaGenerator.apply(this, arguments) || this;
  }

  var _proto = SQLite.prototype;

  _proto.typeForColumn = function typeForColumn(column) {
    return TYPES[column.type] || 'TEXT';
  };

  _proto.transformToText = function transformToText(columnName) {
    return (0, _util.format)('CAST(%s AS text)', columnName);
  };

  _proto.transformToDate = function transformToDate(columnName) {
    return this.transformToText(columnName);
  };

  _proto.transformToDouble = function transformToDouble(columnName) {
    return (0, _util.format)('(CASE ' + 'WHEN LENGTH(TRIM(%s)) = 0 THEN NULL ' + 'WHEN CAST(%s AS REAL) = 0 AND ' + "LENGTH(TRIM(REPLACE(REPLACE(REPLACE(%s, '.', ''), '0', ' '), '-', ''))) > 0 THEN NULL " + 'ELSE CAST(%s AS REAL) ' + 'END)', columnName, columnName, columnName, columnName);
  };

  _proto.createIndex = function createIndex(change) {
    var unique = change.unique ? 'UNIQUE ' : '';
    return (0, _util.format)('CREATE %sINDEX IF NOT EXISTS %s ON %s (%s);', unique, this.indexName(change.newTable, change.columns), this.tableName(change.newTable), change.columns.join(', '));
  };

  _proto.escape = function escape(identifier) {
    if (identifier == null || identifier.length === 0) {
      return '';
    }

    return '`' + identifier + '`';
  };

  return SQLite;
}(_schemaGenerator["default"]);

exports["default"] = SQLite;
//# sourceMappingURL=sqlite.js.map