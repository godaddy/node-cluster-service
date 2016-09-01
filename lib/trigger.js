var cservice = require("../cluster-service");

module.exports = exports = trigger;

function trigger(eventName, cb) {
  var args = Array.prototype.slice.call(arguments);
  if (cservice.isWorker === true) {
    args.splice(1, 1); // remove cb from args if it exists
    cservice.msgBus.sendMessage("trigger", { args: args, cb: true },
      null, function(err, result) {
      // wait for response from master
      if (typeof cb === "function") {
        cb(err, result);
      }
    });
    return;
  }
  var evt = cservice.locals.events[eventName];
  var i;
  if (!evt) {
    // invoke callback if provided instead of throwing
    if (typeof cb === "function") {
      cb("Event " + eventName + " not found");
    } else {
      throw new Error("Event " + eventName + " not found");
    }
  }

  args.splice(0, 1, evt);

  if (typeof cb !== "function") {
    // auto-inject dummy callback if not provided
    args.splice(1, 0, function DummyCallback(err, results) {
      // do nothing
    });
  }

  // invoke event callback
  return evt.cb.apply(null, args);
}
