var cservice = require("../cluster-service");

module.exports = exports = trigger;

function trigger(eventName, cb) {
  if (cservice.isWorker === true) {
    process.send({
      cservice: {
        cmd: "trigger",
        args: Array.prototype.slice.call(arguments)
      }
    });
    return;
  }
  var evt = cservice.locals.events[eventName];
  var args;
  var i;
  if (!evt) {
    // invoke callback if provided instead of throwing
    if (typeof arguments[1] === "function") {
      arguments[1]("Event " + eventName + " not found");
    } else {
      throw new Error("Event " + eventName + " not found");
    }
  }

  args = [evt]; // event is always first arg
  if (arguments.length > 1) { // grab custom args
    for (i = 1; i < arguments.length; i++) {
      args.push(arguments[i]);
    }
  }

  if (args.length < 2 || typeof args[1] !== "function") {
    // auto-inject dummy callback if not provided
    args.splice(1, 0, function DummyCallback(err, results) {
      // do nothing
    });
  }

//exports.log("trigger." + eventName + ".args=" + args.length);
  // invoke event callback
  return evt.cb.apply(null, args);
}
