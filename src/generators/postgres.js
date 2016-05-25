import SchemaGenerator from '../schema-generator';
import {format as fmt} from 'util';

// This function is required in the database

/*
CREATE OR REPLACE FUNCTION convert_to_float(input_value text)
RETURNS FLOAT AS $$
DECLARE float_value FLOAT DEFAULT NULL;
BEGIN
  BEGIN
    float_value := input_value::float;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
RETURN float_value;
END;
$$ LANGUAGE plpgsql;
*/

const TYPES = {
  pk: 'bigserial NOT NULL',
  string: 'text',
  integer: 'bigint',
  date: 'double precision',
  double: 'double precision',
  timestamp: 'timestamp without time zone',
  geometry: 'geometry(Geometry, 4326)',
  json: 'text',
  array: 'text[]',
  boolean: 'boolean',
  fts: 'tsvector'
};

export default class Postgres extends SchemaGenerator {
  typeForColumn(column) {
    return TYPES[column.type] || 'text';
  }

  transformToText(columnName) {
    return fmt('CAST(%s AS text)', columnName);
  }

  // alternate:
  // select '-1.2e10' ~ '^[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?$';
  transformToDouble(columnName) {
    return fmt('convert_to_float(%s)', columnName);
  }

  primaryKeyName(table) {
    return this.escape(this.tablePrefix + table.name + '_pkey');
  }

  primaryKeySequenceName(table) {
    return this.escape(this.tablePrefix + table.name + '_id_seq');
  }

  primaryKey(table) {
    if (table.columns[0].type === 'pk') {
      return fmt('CONSTRAINT %s PRIMARY KEY (%s)',
                 this.primaryKeyName(table),
                 table.columns[0].name);
    }

    return '';
  }

  primarySequenceKey(table) {
    if (table.columns[0].type === 'pk') {
      return fmt('CONSTRAINT %s PRIMARY KEY (%s)',
                 this.primaryKeyName(table),
                 table.columns[0].name);
    }

    return '';
  }

  createTable(change) {
    return fmt('CREATE TABLE IF NOT EXISTS %s (\n  %s\n);',
               this.tableName(change.newTable),
               this.columnsForTable(change.newTable).concat(this.primaryKey(change.newTable)).join(',\n  '));
  }

  createIndex(change) {
    const method = change.method || 'btree';
    const indexName = this.indexName(change.newTable, change.columns);
    const tableName = this.tableName(change.newTable);
    const columns = change.columns.join(', ');
    const unique = change.unique ? 'UNIQUE ' : '';
    const withClause = method === 'gin' ? ' WITH (fastupdate = off)' : '';

    return fmt('CREATE %sINDEX %s ON %s USING %s (%s)%s;',
               unique, indexName, tableName, method, columns, withClause);
  }

  dropTable(change) {
    return fmt('DROP TABLE IF EXISTS %s%s CASCADE;',
               this.escapedSchema(),
               this.escape(this.tablePrefix + change.oldTable.name));
  }

  renameTable(change) {
    const parts = [ super.renameTable(change) ];

    parts.push(fmt('ALTER TABLE %s RENAME CONSTRAINT %s TO %s;',
                   this.tableName(change.newTable),
                   this.primaryKeyName(change.oldTable),
                   this.primaryKeyName(change.newTable)));

    parts.push(fmt('ALTER SEQUENCE %s RENAME TO %s;',
                   this.primaryKeySequenceName(change.oldTable),
                   this.primaryKeySequenceName(change.newTable)));

    return parts;
  }

  createView(change) {
    const viewName = this.viewName(change.newView);
    const tableName = this.tableName(change.newView.table);
    const viewDefinition = this.projectionForView(change.newView);
    const clause = change.newView.clause ? ' ' + change.newView.clause : '';

    return fmt('CREATE OR REPLACE VIEW %s AS\nSELECT\n  %s\nFROM %s%s;',
               viewName, viewDefinition.join(',\n  '), tableName, clause);
  }
}
