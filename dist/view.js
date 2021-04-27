"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var View = /*#__PURE__*/function () {
  function View(id, name, table, options) {
    this.id = id;
    this.name = name || id;
    this.table = table;
    this.columns = [];
    options = options || {};

    for (var _i = 0, _Object$keys = Object.keys(options); _i < _Object$keys.length; _i++) {
      var key = _Object$keys[_i];
      this[key] = options[key];
    }
  }

  var _proto = View.prototype;

  _proto.addColumn = function addColumn(opts) {
    this.columns.push({
      column: opts.column,
      alias: opts.alias,
      raw: opts.raw
    });
    return this;
  };

  return View;
}();

exports["default"] = View;
//# sourceMappingURL=view.js.map