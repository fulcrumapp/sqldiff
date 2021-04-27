"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _column = _interopRequireDefault(require("./column"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var Table = /*#__PURE__*/function () {
  function Table(id, name, options) {
    this.id = id;
    this.name = name || id;
    this.columns = [];
    this.indexes = [];
    options = options || {};

    for (var _i = 0, _Object$keys = Object.keys(options); _i < _Object$keys.length; _i++) {
      var key = _Object$keys[_i];
      this[key] = options[key];
    }
  }

  var _proto = Table.prototype;

  _proto.addIndex = function addIndex(opts) {
    if (!opts.columns) {
      throw new Error('must provide columns parameter');
    }

    this.indexes.push(opts);
  };

  _proto.addColumn = function addColumn(opts) {
    if (opts.id == null) {
      opts.id = opts.name;
    }

    if (opts.name == null) {
      opts.name = opts.id;
    }

    if (opts.allowNull == null) {
      opts.allowNull = true;
    }

    var hasParameters = opts.id && opts.name && opts.type;

    if (!hasParameters) {
      throw new Error('must provide id, name, type parameters');
    }

    var column = new _column["default"](opts);
    this.columns.push(column);
    return this;
  };

  return Table;
}();

exports["default"] = Table;
//# sourceMappingURL=table.js.map