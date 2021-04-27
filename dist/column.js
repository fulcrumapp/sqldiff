"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var Column = /*#__PURE__*/function () {
  function Column(options) {
    this.id = options.id || options.name;
    this.name = options.name;
    this.type = options.type;
    this.allowNull = !!options.allowNull;

    for (var _i = 0, _Object$keys = Object.keys(options); _i < _Object$keys.length; _i++) {
      var key = _Object$keys[_i];
      this[key] = options[key];
    }
  }

  var _proto = Column.prototype;

  _proto.isEqualTo = function isEqualTo(column) {
    return this.id === column.id && this.name === column.name && this.type === column.type && this.allowNull === column.allowNull;
  };

  return Column;
}();

exports["default"] = Column;
//# sourceMappingURL=column.js.map