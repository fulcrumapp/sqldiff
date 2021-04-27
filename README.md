# sqldiff [![Build Status](https://travis-ci.org/fulcrumapp/sqldiff.svg?branch=master)](https://travis-ci.org/fulcrumapp/sqldiff)

Diff SQL table definitions to produce statements to patch them. This module does not execute any SQL.

## Installation

```sh
npm install sqldiff
```

## Example

```js
import { Table, SchemaDiffer, Postgres, SQLite } from 'sqldiff';

// boilerplate to build up old/new table definitions
const oldTable = new Table('users');
const newTable = new Table('users');

oldTable.addColumn('id', 'pk');
oldTable.addColumn('name', 'string');

newTable.addColumn('id', 'pk');
newTable.addColumn('name', 'string');
newTable.addColumn('description', 'string');
newTable.addColumn('age', 'integer');
newTable.addColumn('height', 'double');

// generate a diff of the tables
const differ = new SchemaDiffer({ tables: [oldTable] },
                                { tables: [newTable] });

// now we can turn it into different SQL dialects
const pg = new Postgres(differ);
console.log(pg.generate());

// ALTER TABLE "users" ADD COLUMN "description" text;
// ALTER TABLE "users" ADD COLUMN "age" bigint;
// ALTER TABLE "users" ADD COLUMN "height" float;


const sqlite = new SQLite(differ);
console.log(sqlite.generate());

// ALTER TABLE `users` ADD COLUMN `description` TEXT;
// ALTER TABLE `users` ADD COLUMN `age` INTEGER;
// ALTER TABLE `users` ADD COLUMN `height` REAL;
```
