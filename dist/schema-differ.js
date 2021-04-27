"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _underscore = require("underscore");

var _schemaChange = _interopRequireDefault(require("./schema-change"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class SchemaDiff {
  constructor(oldSchema, newSchema) {
    this.oldSchema = oldSchema;
    this.newSchema = newSchema;
  }

  diff() {
    this.changes = [];
    this.diffTables();
    this.diffColumns();
    this.diffViews();
    this.diffViewColumns();
    this.rawChanges = this.changes.slice();
    this.conflate();
    return this.changes;
  }

  addChange(type, params) {
    this.changes.push(new _schemaChange.default(type, params));
  }

  diffTables() {
    const newTables = this.newSchema ? this.newSchema.tables : null;
    const oldTables = this.oldSchema ? this.oldSchema.tables : null;

    if (this.oldSchema) {
      for (const oldTable of this.oldSchema.tables) {
        let newTable = null;

        if (newTables) {
          newTable = (0, _underscore.find)(newTables, t => t.id === oldTable.id);
        }

        if (newTable) {
          if (newTable.name !== oldTable.name) {
            this.addChange('rename-table', {
              oldTable: oldTable,
              newTable: newTable
            });
          }
        } else {
          this.addChange('drop-table', {
            oldTable: oldTable
          });
        }
      }
    }

    if (this.newSchema) {
      for (const newTable of this.newSchema.tables) {
        let oldTable = null;

        if (oldTables) {
          oldTable = (0, _underscore.find)(oldTables, t => t.id === newTable.id);
        }

        if (!oldTable) {
          this.addChange('create-table', {
            newTable: newTable
          });
        }
      }
    }
  }

  conflate() {
    // if we're re-creating a table, we don't need to rename, drop, or add any new columns because
    // the recreate handles all of those.
    const recreates = (0, _underscore.select)(this.changes, change => change.type === 'recreate-table');
    const ids = (0, _underscore.map)(recreates, change => change.newTable.id);
    this.changes = (0, _underscore.reject)(this.changes, change => {
      const isSimpleChange = (0, _underscore.contains)(['rename-column', 'drop-column', 'add-column'], change.type);
      let isTableAlreadyBeingRecreated = false;

      if (change.newTable) {
        isTableAlreadyBeingRecreated = (0, _underscore.contains)(ids, change.newTable.id);
      }

      return isSimpleChange && isTableAlreadyBeingRecreated;
    });
  }

  get tablesPairsForColumnDiff() {
    // only tables that exist in the old and new schemas should be diff'd for columns
    let pairs = [];

    if (this.newSchema) {
      pairs = this.newSchema.tables.map(newTable => {
        let oldTable = null;

        if (this.oldSchema) {
          oldTable = (0, _underscore.find)(this.oldSchema.tables, t => t.id === newTable.id);
        }

        return {
          oldTable: oldTable,
          newTable: newTable
        };
      });
    } // only process column-level changes on tables that exist already


    pairs = (0, _underscore.filter)(pairs, pair => {
      return pair.oldTable && pair.newTable && pair.oldTable.id === pair.newTable.id;
    });
    return pairs;
  }

  get viewPairsForColumnDiff() {
    // only views that exist in the old and new schemas should be diff'd
    let pairs = [];

    if (this.newSchema && this.newSchema.views) {
      pairs = this.newSchema.views.map(newView => {
        let oldView = null;

        if (this.oldSchema) {
          oldView = (0, _underscore.find)(this.oldSchema.views, t => t.id === newView.id);
        }

        return {
          oldView: oldView,
          newView: newView
        };
      });
    } // only process column-level changes on views that exist already


    pairs = (0, _underscore.filter)(pairs, pair => {
      return pair.oldView && pair.newView && pair.oldView.id === pair.newView.id;
    });
    return pairs;
  }

  diffColumns() {
    const tablePairs = this.tablesPairsForColumnDiff; // Some changes (like column re-ordering) require completely recreating the table.
    // Track the tables we've determined need to be re-created so we don't re-create
    // it multiple times for multiple column re-orderings on the same table.

    const recreatedTableIdentifiers = [];

    for (const pair of tablePairs) {
      const oldColumns = pair.oldTable ? pair.oldTable.columns : [];
      const newColumns = pair.newTable ? pair.newTable.columns : [];

      for (let oldIndex = 0; oldIndex < oldColumns.length; ++oldIndex) {
        const oldColumn = oldColumns[oldIndex];
        let exists = false;

        for (let newIndex = 0; newIndex < newColumns.length; ++newIndex) {
          const newColumn = newColumns[newIndex];

          if (oldColumn.id === newColumn.id) {
            // The column still exists, but something could've changed about it.
            // If the index changed or anything about the column changed, action needs
            // to be taken.
            if (oldIndex !== newIndex || !newColumn.isEqualTo(oldColumn)) {
              // column reordering requires rebuilding the entire table, 1 per table
              if (!(0, _underscore.contains)(recreatedTableIdentifiers, pair.newTable.id)) {
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

      for (let newIndex = 0; newIndex < newColumns.length; ++newIndex) {
        const newColumn = newColumns[newIndex];
        let exists = false;

        for (let oldIndex = 0; oldIndex < oldColumns.length; ++oldIndex) {
          const oldColumn = oldColumns[oldIndex];

          if (oldColumn.id === newColumn.id) {
            exists = true;
          }
        }

        if (!exists) {
          this.addChange('add-column', {
            oldTable: pair.oldTable,
            newTable: pair.newTable,
            column: newColumn
          });
        }
      }
    }
  }

  diffViews() {
    const newViews = this.newSchema && this.newSchema.views ? this.newSchema.views : null;
    const oldViews = this.oldSchema && this.oldSchema.views ? this.oldSchema.views : null;

    if (oldViews) {
      for (const oldView of oldViews) {
        let newView = null;

        if (newViews) {
          newView = (0, _underscore.find)(newViews, t => t.id === oldView.id);
        }

        if (newView) {
          if (oldView.name !== newView.name) {
            this.addChange('drop-view', {
              oldView: oldView
            });
            this.addChange('create-view', {
              newView: newView
            });
          }
        } else {
          this.addChange('drop-view', {
            oldView: oldView
          });
        }
      }
    }

    if (newViews) {
      for (const newView of newViews) {
        let oldView = null;

        if (oldViews) {
          oldView = (0, _underscore.find)(oldViews, t => t.id === newView.id);
        }

        if (!oldView) {
          // do a drop for now `ERROR:  cannot change name of view column`
          this.addChange('drop-view', {
            oldView: newView
          });
          this.addChange('create-view', {
            newView: newView
          });
        }
      }
    }
  }

  diffViewColumns() {
    const viewPairs = this.viewPairsForColumnDiff;
    const recreatedViewIdentifiers = [];

    for (const pair of viewPairs) {
      let needsRebuild = false;
      const oldColumns = pair.oldView ? pair.oldView.columns : [];
      const newColumns = pair.newView ? pair.newView.columns : [];

      for (let oldIndex = 0; oldIndex < oldColumns.length; ++oldIndex) {
        const oldColumn = oldColumns[oldIndex];
        let exists = false;

        for (let newIndex = 0; newIndex < newColumns.length; ++newIndex) {
          const newColumn = newColumns[newIndex];

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

      for (let newIndex = 0; newIndex < newColumns.length; ++newIndex) {
        const newColumn = newColumns[newIndex];
        let exists = false;

        for (let oldIndex = 0; oldIndex < oldColumns.length; ++oldIndex) {
          const oldColumn = oldColumns[oldIndex];

          if (oldColumn.column.id === newColumn.column.id) {
            exists = true;
          }
        }

        if (!exists) {
          // column added to view
          needsRebuild = true;
        }
      }

      if (needsRebuild) {
        if (!(0, _underscore.contains)(recreatedViewIdentifiers, pair.newView.id)) {
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
  }

}

exports.default = SchemaDiff;
//# sourceMappingURL=schema-differ.js.map