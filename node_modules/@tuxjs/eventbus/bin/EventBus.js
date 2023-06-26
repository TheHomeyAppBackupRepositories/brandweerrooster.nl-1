"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Subcriber = /** @class */ (function () {
    function Subcriber(id, eventType, callback, unSubcribe) {
        this.id = id;
        this.eventType = eventType;
        this.callback = callback;
        this.unSubcribe = unSubcribe;
    }
    Subcriber.prototype.unsubcribe = function () {
        this.unSubcribe(this.id, this.eventType);
    };
    return Subcriber;
}());
exports.Subcriber = Subcriber;
var EventBus = /** @class */ (function () {
    function EventBus() {
        this.subscriptions = new Map();
    }
    EventBus.prototype.publish = function (eventType, agrs) {
        if (!this.subscriptions.has(eventType))
            return;
        this.subscriptions.get(eventType).forEach(function (sub) {
            sub.callback(agrs);
        });
    };
    EventBus.prototype.subcribe = function (eventType, callback) {
        var _this = this;
        var id = Symbol(eventType);
        var subcriber = new Subcriber(id, eventType, callback, function (idUnSubcriber, eventTypeSubcriber) {
            for (var i = 0; i < _this.subscriptions.get(eventTypeSubcriber).length; i++) {
                if (idUnSubcriber === id) {
                    _this.subscriptions.get(eventTypeSubcriber).splice(i, 1);
                }
            }
        });
        if (this.subscriptions.has(eventType)) {
            this.subscriptions.get(eventType).push(subcriber);
        }
        else {
            this.subscriptions.set(eventType, [subcriber]);
        }
        return subcriber;
    };
    EventBus.prototype.getSubcribers = function () {
        return this.subscriptions;
    };
    return EventBus;
}());
exports.default = EventBus;
//# sourceMappingURL=EventBus.js.map