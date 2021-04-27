"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _lodash = require("lodash");

var _schemaChange = _interopRequireDefault(require("./schema-change"));

var _util = require("util");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _createForOfIteratorHelperLoose(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (it) return (it = it.call(o)).next.bind(it); if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

var SchemaGenerator = /*#__PURE__*/function () {
  function SchemaGenerator(differ, options) {
    this.differ = differ;
    this.changes = differ.diff();
    this.options = options != null ? options : {};
    this.tableSchema = '';
    this.tablePrefix = '';
  }

  var _proto = SchemaGenerator.prototype;

  _proto.generate = function generate() {
    this.schemaChanges = (0, _lodash.flatten)((0, _lodash.map)(this.transform(), this.statementForChange.bind(this)));
    return this.schemaChanges;
  };

  _proto.transform = function transform() {
    var changes = [];

    if (this.options.beforeTransform) {
      this.options.beforeTransform(this, changes);
    }

    var columnRenamesAndDrops = (0, _lodash.filter)(this.changes, function (change) {
      return change.type === 'drop-column' || change.type === 'rename-column';
    });
    var tablesWithColumnDrops = (0, _lodash.map)(columnRenamesAndDrops, function (change) {
      return change.newTable;
    });
    tablesWithColumnDrops = (0, _lodash.uniq)(tablesWithColumnDrops, false, function (table) {
      return table.id;
    });
    var tablesIdentifiersWithColumnDrops = (0, _lodash.map)(tablesWithColumnDrops, function (table) {
      return table.id;
    });
    var viewChanges = [];

    for (var _iterator = _createForOfIteratorHelperLoose(this.changes), _step; !(_step = _iterator()).done;) {
      var change = _step.value;
      var isSimpleChange = (0, _lodash.includes)(['add-column', 'drop-column', 'rename-column'], change.type);
      var shouldReplaceWithRecreate = isSimpleChange && (0, _lodash.includes)(tablesIdentifiersWithColumnDrops, change.newTable.id);

      if (!shouldReplaceWithRecreate) {
        if ((0, _lodash.includes)(['drop-view', 'create-view'], change.type)) {
          viewChanges.push(change);
        } else {
          changes.push(change);
        }
      }
    }

    var ids = [];

    for (var _iterator2 = _createForOfIteratorHelperLoose(columnRenamesAndDrops), _step2; !(_step2 = _iterator2()).done;) {
      var drop = _step2.value;

      if (!(0, _lodash.includes)(ids, drop.newTable.id)) {
        changes.push(new _schemaChange["default"]('recreate-table', {
          oldTable: drop.oldTable,
          newTable: drop.newTable
        }));
        ids.push(drop.newTable.id);
      }
    } // make sure the view changes are always at the end so the tables exist when they're created


    changes.push.apply(changes, viewChanges);
    this.processIndexes(changes);

    if (this.options.afterTransform) {
      this.options.afterTransform(this, changes);
    }

    return changes;
  };

  _proto.statementForChange = function statementForChange(change) {
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
  };

  _proto.escape = function escape(identifier) {
    if (identifier == null || identifier.length === 0) {
      return '';
    }

    var needsQuotes = /[^_A-Z0-9]/i.test(identifier) || /^[0-9]/.test(identifier);

    if (needsQuotes) {
      return '"' + identifier.replace(/"/g, '""') + '"';
    }

    return identifier;
  };

  _proto.columnDefinition = function columnDefinition(column) {
    return this.escape(column.name) + ' ' + this.typeForColumn(column) + this.columnModifiers(column);
  };

  _proto.columnModifiers = function columnModifiers(column) {
    var mods = [];

    if (column.allowNull === false) {
      mods.push(' NOT NULL');
    }

    if (column.defaultValue != null) {
      mods.push(' DEFAULT ' + column.defaultValue);
    }

    return mods.join('');
  };

  _proto.columnsForTable = function columnsForTable(table) {
    return (0, _lodash.map)(table.columns, this.columnDefinition.bind(this));
  };

  _proto.projectionForTable = function projectionForTable(table) {
    return (0, _lodash.map)(table.columns, function (column) {
      return column.name;
    });
  };

  _proto.projectionForView = function projectionForView(view) {
    var parts = [];

    for (var _iterator3 = _createForOfIteratorHelperLoose(view.columns), _step3; !(_step3 = _iterator3()).done;) {
      var reference = _step3.value;

      if (reference.raw) {
        parts.push(reference.raw);
      } else {
        parts.push((0, _util.format)('%s AS %s', this.escape(reference.column.name), this.escape(reference.alias)));
      }
    }

    return parts;
  };

  _proto.mappingForTables = function mappingForTables(oldTable, newTable) {
    var mappings = [];

    var _loop = function _loop() {
      var newColumn = _step4.value;
      var oldColumn = (0, _lodash.find)(oldTable.columns, function (column) {
        return column.id === newColumn.id;
      });

      if (oldColumn) {
        mappings.push({
          oldColumn: oldColumn,
          newColumn: newColumn
        });
      }
    };

    for (var _iterator4 = _createForOfIteratorHelperLoose(newTable.columns), _step4; !(_step4 = _iterator4()).done;) {
      _loop();
    }

    return mappings;
  };

  _proto.escapedSchema = function escapedSchema() {
    if (this.tableSchema == null || this.tableSchema.length === 0) {
      return '';
    }

    return this.escape(this.tableSchema) + '.';
  };

  _proto.createTable = function createTable(change) {
    return (0, _util.format)('CREATE TABLE IF NOT EXISTS %s (\n  %s\n);', this.tableName(change.newTable), this.columnsForTable(change.newTable).join(',\n  '));
  };

  _proto.raw = function raw(change) {
    return change.sql;
  };

  _proto.recreateTable = function recreateTable(change) {
    var newTableName = change.newTable.name;
    var oldTableName = change.oldTable.name;
    var newTemporaryTableName = 'tmp_new_' + newTableName;
    var oldTemporaryTableName = 'tmp_old_' + oldTableName;
    var parts = [];

    var append = function append(value) {
      parts.push.apply(parts, (0, _lodash.isArray)(value) ? value : [value]);
    };

    append(this.createTable({
      newTable: {
        name: newTemporaryTableName,
        columns: change.newTable.columns
      }
    }));
    append(this.insertInto({
      name: newTemporaryTableName,
      columns: change.newTable.columns
    }, change.oldTable));
    append(this.renameTable({
      oldTable: {
        name: oldTableName
      },
      newTable: {
        name: oldTemporaryTableName
      }
    }));
    append(this.renameTable({
      oldTable: {
        name: newTemporaryTableName
      },
      newTable: {
        name: newTableName
      }
    }));
    append(this.dropTable({
      oldTable: {
        name: oldTemporaryTableName
      }
    }));
    return parts;
  };

  _proto.insertInto = function insertInto(into, from) {
    var _this = this;

    var mappings = this.mappingForTables(from, into);
    var newColumns = (0, _lodash.map)(mappings, function (pair) {
      return _this.escape(pair.newColumn.name);
    });
    var oldColumns = (0, _lodash.map)(mappings, function (column) {
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
  };

  _proto.renameTable = function renameTable(change) {
    return (0, _util.format)('ALTER TABLE %s RENAME TO %s;', this.tableName(change.oldTable), this.escape(this.tablePrefix + change.newTable.name));
  };

  _proto.dropTable = function dropTable(change) {
    return (0, _util.format)('DROP TABLE IF EXISTS %s;', this.tableName(change.oldTable));
  };

  _proto.addColumn = function addColumn(change) {
    return (0, _util.format)('ALTER TABLE %s ADD COLUMN %s;', this.tableName(change.newTable), this.columnDefinition(change.column));
  };

  _proto.dropColumn = function dropColumn(change) {
    return (0, _util.format)('ALTER TABLE %s DROP COLUMN %s;', this.tableName(change.newTable), this.escape(change.column));
  };

  _proto.renameColumn = function renameColumn(change) {
    return (0, _util.format)('ALTER TABLE %s RENAME COLUMN %s TO %s;', this.tableName(change.newTable), this.escape(change.oldColumn.name), this.escape(change.newColumn.name));
  };

  _proto.tableName = function tableName(table) {
    return this.escapedSchema() + this.escape(this.tablePrefix + table.name);
  };

  _proto.viewName = function viewName(view) {
    return this.escapedSchema() + this.escape(this.tablePrefix + view.name);
  };

  _proto.indexName = function indexName(table, columns) {
    return this.escape('idx_' + this.tablePrefix + table.name + '_' + columns.join('_'));
  };

  _proto.dropView = function dropView(change) {
    return (0, _util.format)('DROP VIEW IF EXISTS %s;', this.viewName(change.oldView));
  };

  _proto.createView = function createView(change) {
    return (0, _util.format)('CREATE VIEW IF NOT EXISTS %s AS\nSELECT\n  %s\nFROM %s%s;', this.viewName(change.newView), this.projectionForView(change.newView).join(',\n  '), this.tableName(change.newView.table), change.newView.clause ? ' ' + change.newView.clause : '');
  };

  _proto.createIndex = function createIndex(change) {
    var _this2 = this;

    return (0, _util.format)('CREATE INDEX %s ON %s (%s);', this.indexName(change.newTable, change.columns), this.tableName(change.newTable), change.columns.map(function (c) {
      return _this2.escape(c);
    }).join(', '));
  };

  _proto.processIndexes = function processIndexes(changes) {
    for (var _iterator5 = _createForOfIteratorHelperLoose(changes), _step5; !(_step5 = _iterator5()).done;) {
      var change = _step5.value;

      if ((0, _lodash.includes)(['create-table', 'recreate-table'], change.type)) {
        for (var _iterator6 = _createForOfIteratorHelperLoose(change.newTable.indexes), _step6; !(_step6 = _iterator6()).done;) {
          var index = _step6.value;
          changes.push(new _schemaChange["default"]('create-index', {
            newTable: change.newTable,
            columns: index.columns,
            method: index.method,
            unique: !!index.unique
          }));
        }
      }
    }
  };

  return SchemaGenerator;
}();

exports["default"] = SchemaGenerator;
//# sourceMappingURL=schema-generator.js.map