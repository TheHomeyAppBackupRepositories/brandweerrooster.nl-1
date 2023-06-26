"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var index_1 = __importDefault(require("./index"));
var sub1 = index_1.default.subcribe('event1', function (value) {
    console.log('1: ' + value);
});
index_1.default.subcribe('event1', function (value) {
    console.log('1: ' + value);
});
index_1.default.subcribe('event2', function (value) {
    console.log('2: ' + value);
});
index_1.default.subcribe('event3', function (value) {
    console.log('3: ' + value);
});
index_1.default.publish('event1', 1);
index_1.default.publish('event2', 'hello world 2');
index_1.default.publish('event3', "Hi");
sub1.unsubcribe();
console.log('-----');
index_1.default.publish('event1', 100);
index_1.default.publish('event2', 'hello world 3');
index_1.default.publish('event3', "Say goodbye");
index_1.default.getSubcribers();
//# sourceMappingURL=test.js.map