import _ from 'underscore';
import SchemaChange from './schema-change';
import {format as fmt} from 'util';

export default class SchemaGenerator {
  constructor(differ, options) {
    this.differ = differ;
    this.changes = differ.diff();
    this.options = options != null ? options : {};
    this.tableSchema = '';
    this.tablePrefix = '';
  }

  generate() {
    this.schemaChanges = _.flatten(_.map(this.transform(), this.statementForChange.bind(this)));
    return this.schemaChanges;
  }

  transform() {
    const changes = [];

    if (this.options.beforeTransform) {
      this.options.beforeTransform(this, changes);
    }

    const columnRenamesAndDrops = _.select(this.changes, function (change) {
      return change.type === 'drop-column' || change.type === 'rename-column';
    });

    let tablesWithColumnDrops = _.map(columnRenamesAndDrops, function (change) {
      return change.newTable;
    });

    tablesWithColumnDrops = _.uniq(tablesWithColumnDrops, false, function (table) {
      return table.id;
    });

    const tablesIdentifiersWithColumnDrops = _.map(tablesWithColumnDrops, function (table) {
      return table.id;
    });

    const viewChanges = [];

    for (const change of this.changes) {
      const isSimpleChange = _.contains(['add-column', 'drop-column', 'rename-column'], change.type);

      const shouldReplaceWithRecreate = isSimpleChange && _.contains(tablesIdentifiersWithColumnDrops, change.newTable.id);

      if (!shouldReplaceWithRecreate) {
        if (_.contains(['drop-view', 'create-view'], change.type)) {
          viewChanges.push(change);
        } else {
          changes.push(change);
        }
      }
    }

    const ids = [];

    for (const drop of columnRenamesAndDrops) {
      if (!_.contains(ids, drop.newTable.id)) {
        changes.push(new SchemaChange('recreate-table', {oldTable: drop.oldTable, newTable: drop.newTable}));

        ids.push(drop.newTable.id);
      }
    }

    // make sure the view changes are always at the end so the tables exist when they're created
    changes.push.apply(changes, viewChanges);

    this.processIndexes(changes);

    if (this.options.afterTransform) {
      this.options.afterTransform(this, changes);
    }

    return changes;
  }

  statementForChange(change) {
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

  escape(identifier) {
    if (identifier == null || identifier.length === 0) {
      return '';
    }

    const needsQuotes = /[^_A-Z0-9]/i.test(identifier) ||
                        /^[0-9]/.test(identifier);

    if (needsQuotes) {
      return '"' + (identifier.replace(/"/g, '""')) + '"';
    }

    return identifier;
  }

  columnDefinition(column) {
    return this.escape(column.name) + ' ' + this.typeForColumn(column) + this.columnModifiers(column);
  }

  columnModifiers(column) {
    const mods = [];

    if (column.allowNull === false) {
      mods.push(' NOT NULL');
    }

    if (column.defaultValue != null) {
      mods.push(' DEFAULT ' + column.defaultValue);
    }

    return mods.join('');
  }

  columnsForTable(table) {
    return _.map(table.columns, this.columnDefinition.bind(this));
  }

  projectionForTable(table) {
    return _.map(table.columns, function (column) {
      return column.name;
    });
  }

  projectionForView(view) {
    const parts = [];

    for (const reference of view.columns) {
      if (reference.raw) {
        parts.push(reference.raw);
      } else {
        parts.push(fmt('%s AS %s', this.escape(reference.column.name), this.escape(reference.alias)));
      }
    }

    return parts;
  }

  mappingForTables(oldTable, newTable) {
    const mappings = [];

    for (const newColumn of newTable.columns) {
      const oldColumn = _.find(oldTable.columns, function (column) {
        return column.id === newColumn.id;
      });

      if (oldColumn) {
        mappings.push({
          oldColumn: oldColumn,
          newColumn: newColumn
        });
      }
    }

    return mappings;
  }

  escapedSchema() {
    if (this.tableSchema == null || this.tableSchema.length === 0) {
      return '';
    }

    return this.escape(this.tableSchema) + '.';
  }

  createTable(change) {
    return fmt('CREATE TABLE IF NOT EXISTS %s (\n  %s\n);',
               this.tableName(change.newTable),
               this.columnsForTable(change.newTable).join(',\n  '));
  }

  raw(change) {
    return change.sql;
  }

  recreateTable(change) {
    const newTableName = change.newTable.name;
    const oldTableName = change.oldTable.name;

    const newTemporaryTableName = 'tmp_new_' + newTableName;
    const oldTemporaryTableName = 'tmp_old_' + oldTableName;

    const parts = [];

    const append = (value) => {
      parts.push.apply(parts, _.isArray(value) ? value : [ value ]);
    };

    append(this.createTable({newTable: {name: newTemporaryTableName,
                                        columns: change.newTable.columns}}));

    append(this.insertInto({name: newTemporaryTableName, columns: change.newTable.columns},
                            change.oldTable));

    append(this.renameTable({oldTable: {name: oldTableName},
                             newTable: {name: oldTemporaryTableName}}));

    append(this.renameTable({oldTable: {name: newTemporaryTableName},
                             newTable: {name: newTableName}}));

    append(this.dropTable({oldTable: {name: oldTemporaryTableName}}));

    return parts;
  }

  insertInto(into, from) {
    const mappings = this.mappingForTables(from, into);

    const newColumns = _.map(mappings, (pair) => {
      return this.escape(pair.newColumn.name);
    });

    const oldColumns = _.map(mappings, (column) => {
      // handle data type changes
      if (column.oldColumn.type !== 'double' && column.newColumn.type === 'double') {
        return this.transformToDouble(this.escape(column.oldColumn.name));
      } else if (column.oldColumn.type === 'double' && column.newColumn.type !== 'double') {
        return this.transformToText(this.escape(column.oldColumn.name));
      } else if (column.oldColumn.type !== 'date' && column.newColumn.type === 'date') {
        return this.transformToDate(this.escape(column.oldColumn.name));
      } else {
        return this.escape(column.oldColumn.name);
      }
    });

    return fmt('INSERT INTO %s (%s) SELECT %s FROM %s;',
               this.tableName(into),
               newColumns.join(', '),
               oldColumns.join(', '),
               this.tableName(from));
  }

  renameTable(change) {
    return fmt('ALTER TABLE %s RENAME TO %s;',
               this.tableName(change.oldTable),
               this.escape(this.tablePrefix + change.newTable.name));
  }

  dropTable(change) {
    return fmt('DROP TABLE IF EXISTS %s;',
               this.tableName(change.oldTable));
  }

  addColumn(change) {
    return fmt('ALTER TABLE %s ADD COLUMN %s;',
               this.tableName(change.newTable),
               this.columnDefinition(change.column));
  }

  dropColumn(change) {
    return fmt('ALTER TABLE %s DROP COLUMN %s;',
               this.tableName(change.newTable),
               this.escape(change.column));
  }

  renameColumn(change) {
    return fmt('ALTER TABLE %s RENAME COLUMN %s TO %s;',
               this.tableName(change.newTable),
               this.escape(change.oldColumn.name),
               this.escape(change.newColumn.name));
  }

  tableName(table) {
    return this.escapedSchema() + this.escape(this.tablePrefix + table.name);
  }

  viewName(view) {
    return this.escapedSchema() + this.escape(this.tablePrefix + view.name);
  }

  indexName(table, columns) {
    return this.escape('idx_' + this.tablePrefix + table.name + '_' + columns.join('_'));
  }

  dropView(change) {
    return fmt('DROP VIEW IF EXISTS %s;', this.viewName(change.oldView));
  }

  createView(change) {
    return fmt('CREATE VIEW IF NOT EXISTS %s AS\nSELECT\n  %s\nFROM %s%s;',
               this.viewName(change.newView),
               this.projectionForView(change.newView).join(',\n  '),
               this.tableName(change.newView.table),
               change.newView.clause ? ' ' + change.newView.clause : '');
  }

  createIndex(change) {
    return fmt('CREATE INDEX %s ON %s (%s);',
               this.indexName(change.newTable, change.columns),
               this.tableName(change.newTable),
               change.columns.map(c => this.escape(c)).join(', '));
  }

  processIndexes(changes) {
    for (const change of changes) {
      if (_.contains(['create-table', 'recreate-table'], change.type)) {
        for (const index of change.newTable.indexes) {
          changes.push(new SchemaChange('create-index', {newTable: change.newTable,
                                                         columns: index.columns,
                                                         method: index.method,
                                                         unique: !!index.unique}));
        }
      }
    }
  }
}
