import View from './view';
import Table from './table';
import SQLite from './generators/sqlite';
import Postgres from './generators/postgres';
import MSSQL from './generators/mssql';
import SchemaDiffer from './schema-differ';
import SchemaChange from './schema-change';

export default {
  View: View,
  Table: Table,
  SQLite: SQLite,
  Postgres: Postgres,
  MSSQL: MSSQL,
  SchemaDiffer: SchemaDiffer,
  SchemaChange: SchemaChange
};
