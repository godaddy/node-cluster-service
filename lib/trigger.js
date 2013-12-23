var cservice = require("../cluster-service");

module.exports = exports = trigger;

function trigger(eventName) {
  var evt = cservice.locals.events[eventName];
  var args;
  var i;
  if (!evt) {
    if (typeof arguments[1] === "function") { // invoke callback if provided instead of throwing
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
//exports.log("trigger." + eventName + ".args=" + args.length);
  // invoke event callback
  return evt.cb.apply(null, args);
}
