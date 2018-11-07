'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _schemaChange = require('./schema-change');

var _schemaChange2 = _interopRequireDefault(_schemaChange);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var SchemaDiff = function () {
  function SchemaDiff(oldSchema, newSchema) {
    _classCallCheck(this, SchemaDiff);

    this.oldSchema = oldSchema;
    this.newSchema = newSchema;
  }

  _createClass(SchemaDiff, [{
    key: 'diff',
    value: function diff() {
      this.changes = [];

      this.diffTables();

      this.diffColumns();

      this.diffViews();

      this.diffViewColumns();

      this.rawChanges = this.changes.slice();

      this.conflate();

      return this.changes;
    }
  }, {
    key: 'addChange',
    value: function addChange(type, params) {
      this.changes.push(new _schemaChange2.default(type, params));
    }
  }, {
    key: 'diffTables',
    value: function diffTables() {
      var _this = this;

      var newTables = this.newSchema ? this.newSchema.tables : null;
      var oldTables = this.oldSchema ? this.oldSchema.tables : null;

      if (this.oldSchema) {
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          var _loop = function _loop() {
            var oldTable = _step.value;

            var newTable = null;

            if (newTables) {
              newTable = _underscore2.default.find(newTables, function (t) {
                return t.id === oldTable.id;
              });
            }

            if (newTable) {
              if (newTable.name !== oldTable.name) {
                _this.addChange('rename-table', { oldTable: oldTable, newTable: newTable });
              }
            } else {
              _this.addChange('drop-table', { oldTable: oldTable });
            }
          };

          for (var _iterator = this.oldSchema.tables[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            _loop();
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
      }

      if (this.newSchema) {
        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
          var _loop2 = function _loop2() {
            var newTable = _step2.value;

            var oldTable = null;

            if (oldTables) {
              oldTable = _underscore2.default.find(oldTables, function (t) {
                return t.id === newTable.id;
              });
            }

            if (!oldTable) {
              _this.addChange('create-table', { newTable: newTable });
            }
          };

          for (var _iterator2 = this.newSchema.tables[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            _loop2();
          }
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
      }
    }
  }, {
    key: 'conflate',
    value: function conflate() {
      // if we're re-creating a table, we don't need to rename, drop, or add any new columns because
      // the recreate handles all of those.
      var recreates = _underscore2.default.select(this.changes, function (change) {
        return change.type === 'recreate-table';
      });

      var ids = _underscore2.default.map(recreates, function (change) {
        return change.newTable.id;
      });

      this.changes = _underscore2.default.reject(this.changes, function (change) {
        var isSimpleChange = _underscore2.default.contains(['rename-column', 'drop-column', 'add-column'], change.type);

        var isTableAlreadyBeingRecreated = false;

        if (change.newTable) {
          isTableAlreadyBeingRecreated = _underscore2.default.contains(ids, change.newTable.id);
        }

        return isSimpleChange && isTableAlreadyBeingRecreated;
      });
    }
  }, {
    key: 'diffColumns',
    value: function diffColumns() {
      var tablePairs = this.tablesPairsForColumnDiff;

      // Some changes (like column re-ordering) require completely recreating the table.
      // Track the tables we've determined need to be re-created so we don't re-create
      // it multiple times for multiple column re-orderings on the same table.
      var recreatedTableIdentifiers = [];

      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {
        for (var _iterator3 = tablePairs[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
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
                  if (!_underscore2.default.contains(recreatedTableIdentifiers, pair.newTable.id)) {
                    this.addChange('recreate-table', { oldTable: pair.oldTable, newTable: pair.newTable });

                    recreatedTableIdentifiers.push(pair.newTable.id);
                  }
                } else if (oldColumn.name !== newColumn.name) {
                  // TODO(zhm) this can't be hit because isEqualTo checks the names
                  // SQLite cannot rename columns, so column renames are a bit special
                  this.addChange('rename-column', { oldTable: pair.oldTable, newTable: pair.newTable, oldColumn: oldColumn, newColumn: newColumn });
                }

                exists = true;
              }
            }

            if (!exists) {
              this.addChange('drop-column', { oldTable: pair.oldTable, newTable: pair.newTable, column: oldColumn });
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
              this.addChange('add-column', { oldTable: pair.oldTable, newTable: pair.newTable, column: _newColumn });
            }
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
    }
  }, {
    key: 'diffViews',
    value: function diffViews() {
      var _this2 = this;

      var newViews = this.newSchema && this.newSchema.views ? this.newSchema.views : null;
      var oldViews = this.oldSchema && this.oldSchema.views ? this.oldSchema.views : null;

      if (oldViews) {
        var _iteratorNormalCompletion4 = true;
        var _didIteratorError4 = false;
        var _iteratorError4 = undefined;

        try {
          var _loop3 = function _loop3() {
            var oldView = _step4.value;

            var newView = null;

            if (newViews) {
              newView = _underscore2.default.find(newViews, function (t) {
                return t.id === oldView.id;
              });
            }

            if (newView) {
              if (newView.name !== newView.name) {
                _this2.addChange('drop-view', { oldView: oldView });
                _this2.addChange('create-view', { newView: newView });
              }
            } else {
              _this2.addChange('drop-view', { oldView: oldView });
            }
          };

          for (var _iterator4 = oldViews[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
            _loop3();
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
      }

      if (newViews) {
        var _iteratorNormalCompletion5 = true;
        var _didIteratorError5 = false;
        var _iteratorError5 = undefined;

        try {
          var _loop4 = function _loop4() {
            var newView = _step5.value;

            var oldView = null;

            if (oldViews) {
              oldView = _underscore2.default.find(oldViews, function (t) {
                return t.id === newView.id;
              });
            }

            if (!oldView) {
              // do a drop for now `ERROR:  cannot change name of view column`
              _this2.addChange('drop-view', { oldView: newView });
              _this2.addChange('create-view', { newView: newView });
            }
          };

          for (var _iterator5 = newViews[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
            _loop4();
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
    }
  }, {
    key: 'diffViewColumns',
    value: function diffViewColumns() {
      var viewPairs = this.viewPairsForColumnDiff;

      var recreatedViewIdentifiers = [];

      var _iteratorNormalCompletion6 = true;
      var _didIteratorError6 = false;
      var _iteratorError6 = undefined;

      try {
        for (var _iterator6 = viewPairs[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
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
            if (!_underscore2.default.contains(recreatedViewIdentifiers, pair.newView.id)) {
              this.addChange('drop-view', { oldView: pair.oldView });
              this.addChange('create-view', { newView: pair.newView });

              recreatedViewIdentifiers.push(pair.newView.id);
            }
          }
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
  }, {
    key: 'tablesPairsForColumnDiff',
    get: function get() {
      var _this3 = this;

      // only tables that exist in the old and new schemas should be diff'd for columns
      var pairs = [];

      if (this.newSchema) {
        pairs = this.newSchema.tables.map(function (newTable) {
          var oldTable = null;

          if (_this3.oldSchema) {
            oldTable = _underscore2.default.find(_this3.oldSchema.tables, function (t) {
              return t.id === newTable.id;
            });
          }

          return { oldTable: oldTable, newTable: newTable };
        });
      }

      // only process column-level changes on tables that exist already
      pairs = _underscore2.default.filter(pairs, function (pair) {
        return pair.oldTable && pair.newTable && pair.oldTable.id === pair.newTable.id;
      });

      return pairs;
    }
  }, {
    key: 'viewPairsForColumnDiff',
    get: function get() {
      var _this4 = this;

      // only views that exist in the old and new schemas should be diff'd
      var pairs = [];

      if (this.newSchema && this.newSchema.views) {
        pairs = this.newSchema.views.map(function (newView) {
          var oldView = null;

          if (_this4.oldSchema) {
            oldView = _underscore2.default.find(_this4.oldSchema.views, function (t) {
              return t.id === newView.id;
            });
          }

          return { oldView: oldView, newView: newView };
        });
      }

      // only process column-level changes on views that exist already
      pairs = _underscore2.default.filter(pairs, function (pair) {
        return pair.oldView && pair.newView && pair.oldView.id === pair.newView.id;
      });

      return pairs;
    }
  }]);

  return SchemaDiff;
}();

exports.default = SchemaDiff;
//# sourceMappingURL=schema-differ.js.map