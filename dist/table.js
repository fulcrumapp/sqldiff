"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _column = _interopRequireDefault(require("./column"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Table {
  constructor(id, name, options) {
    this.id = id;
    this.name = name || id;
    this.columns = [];
    this.indexes = [];
    options = options || {};

    for (const key of Object.keys(options)) {
      this[key] = options[key];
    }
  }

  addIndex(opts) {
    if (!opts.columns) {
      throw new Error('must provide columns parameter');
    }

    this.indexes.push(opts);
  }

  addColumn(opts) {
    if (opts.id == null) {
      opts.id = opts.name;
    }

    if (opts.name == null) {
      opts.name = opts.id;
    }

    if (opts.allowNull == null) {
      opts.allowNull = true;
    }

    const hasParameters = opts.id && opts.name && opts.type;

    if (!hasParameters) {
      throw new Error('must provide id, name, type parameters');
    }

    const column = new _column.default(opts);
    this.columns.push(column);
    return this;
  }

}

exports.default = Table;
//# sourceMappingURL=table.js.map