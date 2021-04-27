"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _view = _interopRequireDefault(require("./view"));

var _table = _interopRequireDefault(require("./table"));

var _sqlite = _interopRequireDefault(require("./generators/sqlite"));

var _postgres = _interopRequireDefault(require("./generators/postgres"));

var _mssql = _interopRequireDefault(require("./generators/mssql"));

var _schemaDiffer = _interopRequireDefault(require("./schema-differ"));

var _schemaChange = _interopRequireDefault(require("./schema-change"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _default = {
  View: _view.default,
  Table: _table.default,
  SQLite: _sqlite.default,
  Postgres: _postgres.default,
  MSSQL: _mssql.default,
  SchemaDiffer: _schemaDiffer.default,
  SchemaChange: _schemaChange.default
};
exports.default = _default;
//# sourceMappingURL=index.js.map