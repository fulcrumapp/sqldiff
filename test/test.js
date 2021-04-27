import { flatten } from 'lodash';
import fs from 'fs';
import chai from 'chai';
import glob from 'glob';
import CSON from 'cson';

import Table from '../src/table';
import View from '../src/view';
import SchemaDiffer from '../src/schema-differ';
import Postgres from '../src/generators/postgres';
import SQLite from '../src/generators/sqlite';
import MSSQL from '../src/generators/mssql';

chai.should();

const dumpScript = function (scripts) {
  console.log('----------------------------------');
  console.log(flatten(scripts).join('\n\n'));
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

function setupView(obj, tables) {
  const id = obj[0];
  const name = obj[1];
  const table = tables.find(t => t.name === obj[2]);
  const options = obj[3];
  const columns = obj[4];

  const view = new View(id, name, table, options);

  for (const column of columns) {
    const json = {
      column: {
        name: column[0],
        type: column[1]
      },
      alias: column[2]
    };

    view.addColumn(json);
  }

  return view;
}

function generatePostgres(differ) {
  const generator = new Postgres(differ);
  generator.tableSchema = 'organization_1';
  return generator.generate().join('\n').trim();
}

function generateSQLite(differ) {
  const generator = new SQLite(differ);
  generator.tablePrefix = 'account_1_';
  return generator.generate().join('\n').trim();
}

function generateMSSQL(differ) {
  const generator = new MSSQL(differ);
  generator.tablePrefix = 'account_1_';
  return generator.generate().join('\n').trim();
}

function run(testPath) {
  const spec = CSON.parse(fs.readFileSync(testPath));

  it(spec.name, () => {
    const oldTables = [];
    const oldViews = [];
    const newTables = [];
    const newViews = [];

    for (const oldTable of spec.old) {
      oldTables.push(setupTable(oldTable));
    }

    for (const oldView of spec.oldViews || []) {
      oldViews.push(setupView(oldView, oldTables));
    }

    for (const newTable of spec.new) {
      newTables.push(setupTable(newTable));
    }

    for (const newView of spec.newViews || []) {
      newViews.push(setupView(newView, newTables));
    }

    const differ = new SchemaDiffer(
      { tables: oldTables, views: oldViews },
      { tables: newTables, views: newViews }
    );

    const pg = generatePostgres(differ);
    const sqlite = generateSQLite(differ);
    const mssql = generateMSSQL(differ);

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
