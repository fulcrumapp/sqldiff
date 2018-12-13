'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _schemaGenerator = require('../schema-generator');

var _schemaGenerator2 = _interopRequireDefault(_schemaGenerator);

var _util = require('util');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var TYPES = {
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

var Sqlite = function (_SchemaGenerator) {
  _inherits(Sqlite, _SchemaGenerator);

  function Sqlite() {
    _classCallCheck(this, Sqlite);

    return _possibleConstructorReturn(this, (Sqlite.__proto__ || Object.getPrototypeOf(Sqlite)).apply(this, arguments));
  }

  _createClass(Sqlite, [{
    key: 'typeForColumn',
    value: function typeForColumn(column) {
      return TYPES[column.type] || 'TEXT';
    }
  }, {
    key: 'transformToText',
    value: function transformToText(columnName) {
      return (0, _util.format)('CAST(%s AS text)', columnName);
    }
  }, {
    key: 'transformToDate',
    value: function transformToDate(columnName) {
      return this.transformToText(columnName);
    }
  }, {
    key: 'transformToDouble',
    value: function transformToDouble(columnName) {
      return (0, _util.format)('(CASE ' + 'WHEN LENGTH(TRIM(%s)) = 0 THEN NULL ' + 'WHEN CAST(%s AS REAL) = 0 AND ' + "LENGTH(TRIM(REPLACE(REPLACE(REPLACE(%s, '.', ''), '0', ' '), '-', ''))) > 0 THEN NULL " + 'ELSE CAST(%s AS REAL) ' + 'END)', columnName, columnName, columnName, columnName);
    }
  }, {
    key: 'createIndex',
    value: function createIndex(change) {
      var unique = change.unique ? 'UNIQUE ' : '';

      return (0, _util.format)('CREATE %sINDEX IF NOT EXISTS %s ON %s (%s);', unique, this.indexName(change.newTable, change.columns), this.tableName(change.newTable), change.columns.join(', '));
    }
  }, {
    key: 'escape',
    value: function escape(identifier) {
      if (identifier == null || identifier.length === 0) {
        return '';
      }

      return '`' + identifier + '`';
    }
  }]);

  return Sqlite;
}(_schemaGenerator2.default);

exports.default = Sqlite;
//# sourceMappingURL=sqlite.js.map