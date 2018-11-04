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

var TYPES = {
  pk: 'bigint NOT NULL IDENTITY(1,1) PRIMARY KEY',
  string: 'varchar(max)',
  integer: 'bigint',
  date: 'date',
  time: 'time',
  double: 'float',
  timestamp: 'datetime',
  geometry: 'geography',
  json: 'varchar(max)',
  array: 'varchar(max)',
  boolean: 'bit',
  fts: 'varchar(max)'
};

var MSSQL = function (_SchemaGenerator) {
  _inherits(MSSQL, _SchemaGenerator);

  function MSSQL() {
    _classCallCheck(this, MSSQL);

    return _possibleConstructorReturn(this, (MSSQL.__proto__ || Object.getPrototypeOf(MSSQL)).apply(this, arguments));
  }

  _createClass(MSSQL, [{
    key: 'escape',
    value: function escape(identifier) {
      if (identifier == null || identifier.length === 0) {
        return '';
      }

      return '[' + identifier + ']';
    }
  }, {
    key: 'typeForColumn',
    value: function typeForColumn(column) {
      if (column.type === 'string') {
        if (/_id$/.test(column.name) || column.length != null) {
          return 'varchar(' + (column.length || '100') + ')';
        }
      }

      return TYPES[column.type] || 'varchar(max)';
    }
  }, {
    key: 'transformToText',
    value: function transformToText(columnName) {
      return (0, _util.format)('CAST(%s AS varchar(max))', columnName);
    }
  }, {
    key: 'transformToDouble',
    value: function transformToDouble(columnName) {
      return (0, _util.format)('IIF(ISNUMERIC(%s), %s, NULL)', columnName, columnName);
    }
  }, {
    key: 'createTable',
    value: function createTable(change) {
      return (0, _util.format)('CREATE TABLE %s (\n  %s\n);', this.tableName(change.newTable), this.columnsForTable(change.newTable).join(',\n  '));
    }
  }, {
    key: 'createView',
    value: function createView(change) {
      var whereClause = '';

      if (change.newView.filter) {
        var parts = [];

        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = Object.keys(change.newView.filter)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var field = _step.value;

            parts.push(this.escape(field) + " = '" + change.newView.filter[field] + "'");
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator.return) {
              _iterator.return();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }

        whereClause = ' WHERE ' + parts.join(' AND ');
      }

      return (0, _util.format)('CREATE VIEW %s AS\nSELECT\n  %s\nFROM %s%s;', this.viewName(change.newView), this.projectionForView(change.newView).join(',\n  '), this.tableName(change.newView.table), whereClause);
    }
  }, {
    key: 'createIndex',
    value: function createIndex(change) {
      var _this2 = this;

      var method = change.method || 'btree';
      var indexName = this.indexName(change.newTable, change.columns);
      var tableName = this.tableName(change.newTable);
      var columns = change.columns.map(function (c) {
        return _this2.escape(c);
      }).join(', ');
      var unique = change.unique ? 'UNIQUE ' : '';
      // const withClause = method === 'gin' ? ' WITH (fastupdate = off)' : '';

      var spatial = method === 'spatial' ? ' SPATIAL' : '';

      return (0, _util.format)('CREATE%s %sINDEX %s ON %s (%s);', spatial, unique, indexName, tableName, columns);
    }
  }, {
    key: 'dropTable',
    value: function dropTable(change) {
      return (0, _util.format)('DROP TABLE IF EXISTS %s%s;', this.escapedSchema(), this.escape(this.tablePrefix + change.oldTable.name));
    }
  }, {
    key: 'renameTable',
    value: function renameTable(change) {
      return (0, _util.format)('EXEC sp_rename \'%s\', \'%s\', \'OBJECT\';', this.tableName(change.oldTable).replace(/[\[\]]/g, ''), this.escape(this.tablePrefix + change.newTable.name));
    }
  }, {
    key: 'insertInto',
    value: function insertInto(into, from) {
      var parts = [(0, _util.format)('SET IDENTITY_INSERT %s ON;', this.tableName(into)), _get(MSSQL.prototype.__proto__ || Object.getPrototypeOf(MSSQL.prototype), 'insertInto', this).call(this, into, from), (0, _util.format)('SET IDENTITY_INSERT %s OFF;', this.tableName(into)), (0, _util.format)('DBCC CHECKIDENT (\'%s\');', this.tableName(into))];

      return parts;
    }
  }]);

  return MSSQL;
}(_schemaGenerator2.default);

exports.default = MSSQL;
//# sourceMappingURL=mssql.js.map