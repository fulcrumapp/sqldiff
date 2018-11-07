import _ from 'underscore';
import fs from 'fs';
import chai from 'chai';
import glob from 'glob';
import CSON from 'cson';

import Table from '../src/table';
import SchemaDiffer from '../src/schema-differ';
import Postgres from '../src/generators/postgres';
import Sqlite from '../src/generators/sqlite';
import MSSQL from '../src/generators/mssql';

chai.should();

const dumpScript = function (scripts) {
  console.log('----------------------------------');
  console.log(_.flatten(scripts).join('\n\n'));
  console.log('----------------------------------');
};

function setupTable(obj) {
  const name = obj[0];
  const columns = obj[1];

  const table = new Table(name);

  for (const column of columns) {
    const json = {};

    if (column.length === 2) {
      json.id = column[0];
      json.name = column[0];
      json.type = column[1];
      json.allowNull = true;
    } else if (column.length === 3) {
      json.id = column[0];
      json.name = column[0];
      json.type = column[1];
      json.allowNull = column[2];
    } else if (column.length === 4) {
      json.id = column[0];
      json.name = column[1];
      json.type = column[2];
      json.allowNull = column[3];
    }

    table.addColumn(json);
  }

  return table;
}

function generatePostgres(differ) {
  const gen = new Postgres(differ, { enableViews: false });
  gen.tableSchema = 'organization_1';
  return gen.generate().join('\n').trim();
}

function generateSqlite(differ) {
  const gen = new Sqlite(differ, { enableViews: false });
  gen.tablePrefix = 'account_1_';
  return gen.generate().join('\n').trim();
}

function generateMssql(differ) {
  const gen = new MSSQL(differ, { enableViews: false });
  gen.tablePrefix = 'account_1_';
  return gen.generate().join('\n').trim();
}

function run(testPath) {
  const spec = CSON.parse(fs.readFileSync(testPath));

  it(spec.name, () => {
    const oldTables = [];
    const newTables = [];

    for (const oldTable of spec.old) {
      oldTables.push(setupTable(oldTable));
    }

    for (const newTable of spec.new) {
      newTables.push(setupTable(newTable));
    }

    const differ = new SchemaDiffer({tables: oldTables}, {tables: newTables});

    const pg = generatePostgres(differ);
    const sqlite = generateSqlite(differ);
    const mssql = generateMssql(differ);

    pg.should.eql(spec.postgres);
    sqlite.should.eql(spec.sqlite);
    mssql.should.eql(spec.mssql);
  });
}

const files = glob.sync('test/fixtures/*.cson');

describe('schema diff', () => {
  for (const file of files) {
    run(file);
  }
});
