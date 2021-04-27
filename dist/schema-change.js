"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var SchemaChange = function SchemaChange(type, options) {
  this.type = type;

  for (var _i = 0, _Object$keys = Object.keys(options); _i < _Object$keys.length; _i++) {
    var key = _Object$keys[_i];
    this[key] = options[key];
  }
};

exports["default"] = SchemaChange;
//# sourceMappingURL=schema-change.js.map