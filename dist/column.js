"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

class Column {
  constructor(options) {
    this.id = options.id || options.name;
    this.name = options.name;
    this.type = options.type;
    this.allowNull = !!options.allowNull;

    for (const key of Object.keys(options)) {
      this[key] = options[key];
    }
  }

  isEqualTo(column) {
    return this.id === column.id && this.name === column.name && this.type === column.type && this.allowNull === column.allowNull;
  }

}

exports.default = Column;
//# sourceMappingURL=column.js.map