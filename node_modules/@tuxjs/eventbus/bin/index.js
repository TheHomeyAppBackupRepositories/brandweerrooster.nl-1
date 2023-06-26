"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var EventBus_1 = __importStar(require("./EventBus"));
exports.Subcriber = EventBus_1.Subcriber;
var eventBus = new EventBus_1.default();
module.exports = eventBus;
//# sourceMappingURL=index.js.map