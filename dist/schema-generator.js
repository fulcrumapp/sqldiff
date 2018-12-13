'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _schemaChange = require('./schema-change');

var _schemaChange2 = _interopRequireDefault(_schemaChange);

var _util = require('util');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var SchemaGenerator = function () {
  function SchemaGenerator(differ, options) {
    _classCallCheck(this, SchemaGenerator);

    this.differ = differ;
    this.changes = differ.diff();
    this.options = options != null ? options : {};
    this.tableSchema = '';
    this.tablePrefix = '';
  }

  _createClass(SchemaGenerator, [{
    key: 'generate',
    value: function generate() {
      this.schemaChanges = _underscore2.default.flatten(_underscore2.default.map(this.transform(), this.statementForChange.bind(this)));
      return this.schemaChanges;
    }
  }, {
    key: 'transform',
    value: function transform() {
      var changes = [];

      if (this.options.beforeTransform) {
        this.options.beforeTransform(this, changes);
      }

      var columnRenamesAndDrops = _underscore2.default.select(this.changes, function (change) {
        return change.type === 'drop-column' || change.type === 'rename-column';
      });

      var tablesWithColumnDrops = _underscore2.default.map(columnRenamesAndDrops, function (change) {
        return change.newTable;
      });

      tablesWithColumnDrops = _underscore2.default.uniq(tablesWithColumnDrops, false, function (table) {
        return table.id;
      });

      var tablesIdentifiersWithColumnDrops = _underscore2.default.map(tablesWithColumnDrops, function (table) {
        return table.id;
      });

      var viewChanges = [];

      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = this.changes[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var change = _step.value;

          var isSimpleChange = _underscore2.default.contains(['add-column', 'drop-column', 'rename-column'], change.type);

          var shouldReplaceWithRecreate = isSimpleChange && _underscore2.default.contains(tablesIdentifiersWithColumnDrops, change.newTable.id);

          if (!shouldReplaceWithRecreate) {
            if (_underscore2.default.contains(['drop-view', 'create-view'], change.type)) {
              viewChanges.push(change);
            } else {
              changes.push(change);
            }
          }
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

      var ids = [];

      var _iteratorNormalCompletion2 = true;
      var _didIteratorError2 = false;
      var _iteratorError2 = undefined;

      try {
        for (var _iterator2 = columnRenamesAndDrops[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
          var drop = _step2.value;

          if (!_underscore2.default.contains(ids, drop.newTable.id)) {
            changes.push(new _schemaChange2.default('recreate-table', { oldTable: drop.oldTable, newTable: drop.newTable }));

            ids.push(drop.newTable.id);
          }
        }

        // make sure the view changes are always at the end so the tables exist when they're created
      } catch (err) {
        _didIteratorError2 = true;
        _iteratorError2 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion2 && _iterator2.return) {
            _iterator2.return();
          }
        } finally {
          if (_didIteratorError2) {
            throw _iteratorError2;
          }
        }
      }

      changes.push.apply(changes, viewChanges);

      this.processIndexes(changes);

      if (this.options.afterTransform) {
        this.options.afterTransform(this, changes);
      }

      return changes;
    }
  }, {
    key: 'statementForChange',
    value: function statementForChange(change) {
      switch (change.type) {
        case 'create-table':
          return this.createTable(change);
        case 'recreate-table':
          return this.recreateTable(change);
        case 'drop-table':
          return this.dropTable(change);
        case 'add-column':
          return this.addColumn(change);
        case 'drop-column':
          return this.dropColumn(change);
        case 'rename-column':
          return this.renameColumn(change);
        case 'drop-view':
          return this.dropView(change);
        case 'create-view':
          return this.createView(change);
        case 'create-index':
          return this.createIndex(change);
        case 'raw':
          return this.raw(change);
        default:
          throw new Error('Invalid change type ' + change.type);
      }
    }
  }, {
    key: 'escape',
    value: function escape(identifier) {
      if (identifier == null || identifier.length === 0) {
        return '';
      }

      var needsQuotes = /[^_A-Z0-9]/i.test(identifier) || /^[0-9]/.test(identifier);

      if (needsQuotes) {
        return '"' + identifier.replace(/"/g, '""') + '"';
      }

      return identifier;
    }
  }, {
    key: 'columnDefinition',
    value: function columnDefinition(column) {
      return this.escape(column.name) + ' ' + this.typeForColumn(column) + this.columnModifiers(column);
    }
  }, {
    key: 'columnModifiers',
    value: function columnModifiers(column) {
      var mods = [];

      if (column.allowNull === false) {
        mods.push(' NOT NULL');
      }

      if (column.defaultValue != null) {
        mods.push(' DEFAULT ' + column.defaultValue);
      }

      return mods.join('');
    }
  }, {
    key: 'columnsForTable',
    value: function columnsForTable(table) {
      return _underscore2.default.map(table.columns, this.columnDefinition.bind(this));
    }
  }, {
    key: 'projectionForTable',
    value: function projectionForTable(table) {
      return _underscore2.default.map(table.columns, function (column) {
        return column.name;
      });
    }
  }, {
    key: 'projectionForView',
    value: function projectionForView(view) {
      var parts = [];

      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {
        for (var _iterator3 = view.columns[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          var reference = _step3.value;

          if (reference.raw) {
            parts.push(reference.raw);
          } else {
            parts.push((0, _util.format)('%s AS %s', this.escape(reference.column.name), this.escape(reference.alias)));
          }
        }
      } catch (err) {
        _didIteratorError3 = true;
        _iteratorError3 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion3 && _iterator3.return) {
            _iterator3.return();
          }
        } finally {
          if (_didIteratorError3) {
            throw _iteratorError3;
          }
        }
      }

      return parts;
    }
  }, {
    key: 'mappingForTables',
    value: function mappingForTables(oldTable, newTable) {
      var mappings = [];

      var _iteratorNormalCompletion4 = true;
      var _didIteratorError4 = false;
      var _iteratorError4 = undefined;

      try {
        var _loop = function _loop() {
          var newColumn = _step4.value;

          var oldColumn = _underscore2.default.find(oldTable.columns, function (column) {
            return column.id === newColumn.id;
          });

          if (oldColumn) {
            mappings.push({
              oldColumn: oldColumn,
              newColumn: newColumn
            });
          }
        };

        for (var _iterator4 = newTable.columns[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
          _loop();
        }
      } catch (err) {
        _didIteratorError4 = true;
        _iteratorError4 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion4 && _iterator4.return) {
            _iterator4.return();
          }
        } finally {
          if (_didIteratorError4) {
            throw _iteratorError4;
          }
        }
      }

      return mappings;
    }
  }, {
    key: 'escapedSchema',
    value: function escapedSchema() {
      if (this.tableSchema == null || this.tableSchema.length === 0) {
        return '';
      }

      return this.escape(this.tableSchema) + '.';
    }
  }, {
    key: 'createTable',
    value: function createTable(change) {
      return (0, _util.format)('CREATE TABLE IF NOT EXISTS %s (\n  %s\n);', this.tableName(change.newTable), this.columnsForTable(change.newTable).join(',\n  '));
    }
  }, {
    key: 'raw',
    value: function raw(change) {
      return change.sql;
    }
  }, {
    key: 'recreateTable',
    value: function recreateTable(change) {
      var newTableName = change.newTable.name;
      var oldTableName = change.oldTable.name;

      var newTemporaryTableName = 'tmp_new_' + newTableName;
      var oldTemporaryTableName = 'tmp_old_' + oldTableName;

      var parts = [];

      var append = function append(value) {
        parts.push.apply(parts, _underscore2.default.isArray(value) ? value : [value]);
      };

      append(this.createTable({ newTable: { name: newTemporaryTableName,
          columns: change.newTable.columns } }));

      append(this.insertInto({ name: newTemporaryTableName, columns: change.newTable.columns }, change.oldTable));

      append(this.renameTable({ oldTable: { name: oldTableName },
        newTable: { name: oldTemporaryTableName } }));

      append(this.renameTable({ oldTable: { name: newTemporaryTableName },
        newTable: { name: newTableName } }));

      append(this.dropTable({ oldTable: { name: oldTemporaryTableName } }));

      return parts;
    }
  }, {
    key: 'insertInto',
    value: function insertInto(into, from) {
      var _this = this;

      var mappings = this.mappingForTables(from, into);

      var newColumns = _underscore2.default.map(mappings, function (pair) {
        return _this.escape(pair.newColumn.name);
      });

      var oldColumns = _underscore2.default.map(mappings, function (column) {
        // handle data type changes
        if (column.oldColumn.type !== 'double' && column.newColumn.type === 'double') {
          return _this.transformToDouble(_this.escape(column.oldColumn.name));
        } else if (column.oldColumn.type === 'double' && column.newColumn.type !== 'double') {
          return _this.transformToText(_this.escape(column.oldColumn.name));
        } else if (column.oldColumn.type !== 'date' && column.newColumn.type === 'date') {
          return _this.transformToDate(_this.escape(column.oldColumn.name));
        } else {
          return _this.escape(column.oldColumn.name);
        }
      });

      return (0, _util.format)('INSERT INTO %s (%s) SELECT %s FROM %s;', this.tableName(into), newColumns.join(', '), oldColumns.join(', '), this.tableName(from));
    }
  }, {
    key: 'renameTable',
    value: function renameTable(change) {
      return (0, _util.format)('ALTER TABLE %s RENAME TO %s;', this.tableName(change.oldTable), this.escape(this.tablePrefix + change.newTable.name));
    }
  }, {
    key: 'dropTable',
    value: function dropTable(change) {
      return (0, _util.format)('DROP TABLE IF EXISTS %s;', this.tableName(change.oldTable));
    }
  }, {
    key: 'addColumn',
    value: function addColumn(change) {
      return (0, _util.format)('ALTER TABLE %s ADD COLUMN %s;', this.tableName(change.newTable), this.columnDefinition(change.column));
    }
  }, {
    key: 'dropColumn',
    value: function dropColumn(change) {
      return (0, _util.format)('ALTER TABLE %s DROP COLUMN %s;', this.tableName(change.newTable), this.escape(change.column));
    }
  }, {
    key: 'renameColumn',
    value: function renameColumn(change) {
      return (0, _util.format)('ALTER TABLE %s RENAME COLUMN %s TO %s;', this.tableName(change.newTable), this.escape(change.oldColumn.name), this.escape(change.newColumn.name));
    }
  }, {
    key: 'tableName',
    value: function tableName(table) {
      return this.escapedSchema() + this.escape(this.tablePrefix + table.name);
    }
  }, {
    key: 'viewName',
    value: function viewName(view) {
      return this.escapedSchema() + this.escape(this.tablePrefix + view.name);
    }
  }, {
    key: 'indexName',
    value: function indexName(table, columns) {
      return this.escape('idx_' + this.tablePrefix + table.name + '_' + columns.join('_'));
    }
  }, {
    key: 'dropView',
    value: function dropView(change) {
      return (0, _util.format)('DROP VIEW IF EXISTS %s;', this.viewName(change.oldView));
    }
  }, {
    key: 'createView',
    value: function createView(change) {
      return (0, _util.format)('CREATE VIEW IF NOT EXISTS %s AS\nSELECT\n  %s\nFROM %s%s;', this.viewName(change.newView), this.projectionForView(change.newView).join(',\n  '), this.tableName(change.newView.table), change.newView.clause ? ' ' + change.newView.clause : '');
    }
  }, {
    key: 'createIndex',
    value: function createIndex(change) {
      var _this2 = this;

      return (0, _util.format)('CREATE INDEX %s ON %s (%s);', this.indexName(change.newTable, change.columns), this.tableName(change.newTable), change.columns.map(function (c) {
        return _this2.escape(c);
      }).join(', '));
    }
  }, {
    key: 'processIndexes',
    value: function processIndexes(changes) {
      var _iteratorNormalCompletion5 = true;
      var _didIteratorError5 = false;
      var _iteratorError5 = undefined;

      try {
        for (var _iterator5 = changes[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
          var change = _step5.value;

          if (_underscore2.default.contains(['create-table', 'recreate-table'], change.type)) {
            var _iteratorNormalCompletion6 = true;
            var _didIteratorError6 = false;
            var _iteratorError6 = undefined;

            try {
              for (var _iterator6 = change.newTable.indexes[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
                var index = _step6.value;

                changes.push(new _schemaChange2.default('create-index', { newTable: change.newTable,
                  columns: index.columns,
                  method: index.method,
                  unique: !!index.unique }));
              }
            } catch (err) {
              _didIteratorError6 = true;
              _iteratorError6 = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion6 && _iterator6.return) {
                  _iterator6.return();
                }
              } finally {
                if (_didIteratorError6) {
                  throw _iteratorError6;
                }
              }
            }
          }
        }
      } catch (err) {
        _didIteratorError5 = true;
        _iteratorError5 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion5 && _iterator5.return) {
            _iterator5.return();
          }
        } finally {
          if (_didIteratorError5) {
            throw _iteratorError5;
          }
        }
      }
    }
  }]);

  return SchemaGenerator;
}();

exports.default = SchemaGenerator;
//# sourceMappingURL=schema-generator.js.map