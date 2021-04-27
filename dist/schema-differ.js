"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _lodash = require("lodash");

var _schemaChange = _interopRequireDefault(require("./schema-change"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _createForOfIteratorHelperLoose(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (it) return (it = it.call(o)).next.bind(it); if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var SchemaDiff = /*#__PURE__*/function () {
  function SchemaDiff(oldSchema, newSchema) {
    this.oldSchema = oldSchema;
    this.newSchema = newSchema;
  }

  var _proto = SchemaDiff.prototype;

  _proto.diff = function diff() {
    this.changes = [];
    this.diffTables();
    this.diffColumns();
    this.diffViews();
    this.diffViewColumns();
    this.rawChanges = this.changes.slice();
    this.conflate();
    return this.changes;
  };

  _proto.addChange = function addChange(type, params) {
    this.changes.push(new _schemaChange["default"](type, params));
  };

  _proto.diffTables = function diffTables() {
    var _this = this;

    var newTables = this.newSchema ? this.newSchema.tables : null;
    var oldTables = this.oldSchema ? this.oldSchema.tables : null;

    if (this.oldSchema) {
      var _loop = function _loop() {
        var oldTable = _step.value;
        var newTable = null;

        if (newTables) {
          newTable = (0, _lodash.find)(newTables, function (t) {
            return t.id === oldTable.id;
          });
        }

        if (newTable) {
          if (newTable.name !== oldTable.name) {
            _this.addChange('rename-table', {
              oldTable: oldTable,
              newTable: newTable
            });
          }
        } else {
          _this.addChange('drop-table', {
            oldTable: oldTable
          });
        }
      };

      for (var _iterator = _createForOfIteratorHelperLoose(this.oldSchema.tables), _step; !(_step = _iterator()).done;) {
        _loop();
      }
    }

    if (this.newSchema) {
      var _loop2 = function _loop2() {
        var newTable = _step2.value;
        var oldTable = null;

        if (oldTables) {
          oldTable = (0, _lodash.find)(oldTables, function (t) {
            return t.id === newTable.id;
          });
        }

        if (!oldTable) {
          _this.addChange('create-table', {
            newTable: newTable
          });
        }
      };

      for (var _iterator2 = _createForOfIteratorHelperLoose(this.newSchema.tables), _step2; !(_step2 = _iterator2()).done;) {
        _loop2();
      }
    }
  };

  _proto.conflate = function conflate() {
    // if we're re-creating a table, we don't need to rename, drop, or add any new columns because
    // the recreate handles all of those.
    var recreates = (0, _lodash.filter)(this.changes, function (change) {
      return change.type === 'recreate-table';
    });
    var ids = (0, _lodash.map)(recreates, function (change) {
      return change.newTable.id;
    });
    this.changes = (0, _lodash.reject)(this.changes, function (change) {
      var isSimpleChange = (0, _lodash.includes)(['rename-column', 'drop-column', 'add-column'], change.type);
      var isTableAlreadyBeingRecreated = false;

      if (change.newTable) {
        isTableAlreadyBeingRecreated = (0, _lodash.includes)(ids, change.newTable.id);
      }

      return isSimpleChange && isTableAlreadyBeingRecreated;
    });
  };

  _proto.diffColumns = function diffColumns() {
    var tablePairs = this.tablesPairsForColumnDiff; // Some changes (like column re-ordering) require completely recreating the table.
    // Track the tables we've determined need to be re-created so we don't re-create
    // it multiple times for multiple column re-orderings on the same table.

    var recreatedTableIdentifiers = [];

    for (var _iterator3 = _createForOfIteratorHelperLoose(tablePairs), _step3; !(_step3 = _iterator3()).done;) {
      var pair = _step3.value;
      var oldColumns = pair.oldTable ? pair.oldTable.columns : [];
      var newColumns = pair.newTable ? pair.newTable.columns : [];

      for (var oldIndex = 0; oldIndex < oldColumns.length; ++oldIndex) {
        var oldColumn = oldColumns[oldIndex];
        var exists = false;

        for (var newIndex = 0; newIndex < newColumns.length; ++newIndex) {
          var newColumn = newColumns[newIndex];

          if (oldColumn.id === newColumn.id) {
            // The column still exists, but something could've changed about it.
            // If the index changed or anything about the column changed, action needs
            // to be taken.
            if (oldIndex !== newIndex || !newColumn.isEqualTo(oldColumn)) {
              // column reordering requires rebuilding the entire table, 1 per table
              if (!(0, _lodash.includes)(recreatedTableIdentifiers, pair.newTable.id)) {
                this.addChange('recreate-table', {
                  oldTable: pair.oldTable,
                  newTable: pair.newTable
                });
                recreatedTableIdentifiers.push(pair.newTable.id);
              }
            } else if (oldColumn.name !== newColumn.name) {
              // TODO(zhm) this can't be hit because isEqualTo checks the names
              // SQLite cannot rename columns, so column renames are a bit special
              this.addChange('rename-column', {
                oldTable: pair.oldTable,
                newTable: pair.newTable,
                oldColumn: oldColumn,
                newColumn: newColumn
              });
            }

            exists = true;
          }
        }

        if (!exists) {
          this.addChange('drop-column', {
            oldTable: pair.oldTable,
            newTable: pair.newTable,
            column: oldColumn
          });
        }
      }

      for (var _newIndex = 0; _newIndex < newColumns.length; ++_newIndex) {
        var _newColumn = newColumns[_newIndex];
        var _exists = false;

        for (var _oldIndex = 0; _oldIndex < oldColumns.length; ++_oldIndex) {
          var _oldColumn = oldColumns[_oldIndex];

          if (_oldColumn.id === _newColumn.id) {
            _exists = true;
          }
        }

        if (!_exists) {
          this.addChange('add-column', {
            oldTable: pair.oldTable,
            newTable: pair.newTable,
            column: _newColumn
          });
        }
      }
    }
  };

  _proto.diffViews = function diffViews() {
    var _this2 = this;

    var newViews = this.newSchema && this.newSchema.views ? this.newSchema.views : null;
    var oldViews = this.oldSchema && this.oldSchema.views ? this.oldSchema.views : null;

    if (oldViews) {
      var _loop3 = function _loop3() {
        var oldView = _step4.value;
        var newView = null;

        if (newViews) {
          newView = (0, _lodash.find)(newViews, function (t) {
            return t.id === oldView.id;
          });
        }

        if (newView) {
          if (oldView.name !== newView.name) {
            _this2.addChange('drop-view', {
              oldView: oldView
            });

            _this2.addChange('create-view', {
              newView: newView
            });
          }
        } else {
          _this2.addChange('drop-view', {
            oldView: oldView
          });
        }
      };

      for (var _iterator4 = _createForOfIteratorHelperLoose(oldViews), _step4; !(_step4 = _iterator4()).done;) {
        _loop3();
      }
    }

    if (newViews) {
      var _loop4 = function _loop4() {
        var newView = _step5.value;
        var oldView = null;

        if (oldViews) {
          oldView = (0, _lodash.find)(oldViews, function (t) {
            return t.id === newView.id;
          });
        }

        if (!oldView) {
          // do a drop for now `ERROR:  cannot change name of view column`
          _this2.addChange('drop-view', {
            oldView: newView
          });

          _this2.addChange('create-view', {
            newView: newView
          });
        }
      };

      for (var _iterator5 = _createForOfIteratorHelperLoose(newViews), _step5; !(_step5 = _iterator5()).done;) {
        _loop4();
      }
    }
  };

  _proto.diffViewColumns = function diffViewColumns() {
    var viewPairs = this.viewPairsForColumnDiff;
    var recreatedViewIdentifiers = [];

    for (var _iterator6 = _createForOfIteratorHelperLoose(viewPairs), _step6; !(_step6 = _iterator6()).done;) {
      var pair = _step6.value;
      var needsRebuild = false;
      var oldColumns = pair.oldView ? pair.oldView.columns : [];
      var newColumns = pair.newView ? pair.newView.columns : [];

      for (var oldIndex = 0; oldIndex < oldColumns.length; ++oldIndex) {
        var oldColumn = oldColumns[oldIndex];
        var exists = false;

        for (var newIndex = 0; newIndex < newColumns.length; ++newIndex) {
          var newColumn = newColumns[newIndex];

          if (oldColumn.column.id === newColumn.column.id) {
            // The column still exists, but something could've changed about it.
            // If the index changed or anything about the column changed, action needs
            // to be taken.
            if (oldIndex !== newIndex || newColumn.column.name !== oldColumn.column.name || newColumn.column.type !== oldColumn.column.type || newColumn.alias !== oldColumn.alias) {
              // column moved within view
              needsRebuild = true;
            }

            exists = true;
          }
        }

        if (!exists) {
          // column removed from view
          needsRebuild = true;
        }
      }

      for (var _newIndex2 = 0; _newIndex2 < newColumns.length; ++_newIndex2) {
        var _newColumn2 = newColumns[_newIndex2];
        var _exists2 = false;

        for (var _oldIndex2 = 0; _oldIndex2 < oldColumns.length; ++_oldIndex2) {
          var _oldColumn2 = oldColumns[_oldIndex2];

          if (_oldColumn2.column.id === _newColumn2.column.id) {
            _exists2 = true;
          }
        }

        if (!_exists2) {
          // column added to view
          needsRebuild = true;
        }
      }

      if (needsRebuild) {
        if (!(0, _lodash.includes)(recreatedViewIdentifiers, pair.newView.id)) {
          this.addChange('drop-view', {
            oldView: pair.oldView
          });
          this.addChange('create-view', {
            newView: pair.newView
          });
          recreatedViewIdentifiers.push(pair.newView.id);
        }
      }
    }
  };

  _createClass(SchemaDiff, [{
    key: "tablesPairsForColumnDiff",
    get: function get() {
      var _this3 = this;

      // only tables that exist in the old and new schemas should be diff'd for columns
      var pairs = [];

      if (this.newSchema) {
        pairs = this.newSchema.tables.map(function (newTable) {
          var oldTable = null;

          if (_this3.oldSchema) {
            oldTable = (0, _lodash.find)(_this3.oldSchema.tables, function (t) {
              return t.id === newTable.id;
            });
          }

          return {
            oldTable: oldTable,
            newTable: newTable
          };
        });
      } // only process column-level changes on tables that exist already


      pairs = (0, _lodash.filter)(pairs, function (pair) {
        return pair.oldTable && pair.newTable && pair.oldTable.id === pair.newTable.id;
      });
      return pairs;
    }
  }, {
    key: "viewPairsForColumnDiff",
    get: function get() {
      var _this4 = this;

      // only views that exist in the old and new schemas should be diff'd
      var pairs = [];

      if (this.newSchema && this.newSchema.views) {
        pairs = this.newSchema.views.map(function (newView) {
          var oldView = null;

          if (_this4.oldSchema) {
            oldView = (0, _lodash.find)(_this4.oldSchema.views, function (t) {
              return t.id === newView.id;
            });
          }

          return {
            oldView: oldView,
            newView: newView
          };
        });
      } // only process column-level changes on views that exist already


      pairs = (0, _lodash.filter)(pairs, function (pair) {
        return pair.oldView && pair.newView && pair.oldView.id === pair.newView.id;
      });
      return pairs;
    }
  }]);

  return SchemaDiff;
}();

exports["default"] = SchemaDiff;
//# sourceMappingURL=schema-differ.js.map