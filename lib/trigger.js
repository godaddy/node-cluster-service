var
	cservice = require("../cluster-service")
;

module.exports = exports = trigger;

function trigger(eventName) {
	var evt = cservice.locals.events[eventName];
	if (!evt) {
		throw new Error("Event " + eventName + " not found");
	}

	var args = [evt]; // event is always first arg
	if (arguments.length > 1) { // grab custom args
		for (var i = 1; i < arguments.length; i++) {
			args.push(arguments[i]);
		}
	}
//exports.log("trigger." + eventName + ".args=" + args.length);
	// invoke event callback
	return evt.cb.apply(null, args);
}
