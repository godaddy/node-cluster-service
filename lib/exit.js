var
	util = require("util")
;

module.exports = function(evt, cb, cmd) {
	if (cmd !== "now") {
		cb("Invalid request, 'now' required. Try help exit");
		return;
	}

	console.log("*** FORCEFUL TERMINATION REQUESTED ***", "Exiting now.");

	process.exit(0); // exit master

	cb(null, "Exiting now.");
};

module.exports.more = function(cb) {
	cb(null, {
		info: "Forcefully exits the service.",
		command: "exit now",
		"now": "Required. 'now' to force exit."
	});
};
