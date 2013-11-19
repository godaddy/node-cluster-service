var
	util = require("util"),
	cservice = require("../../cluster-service")
;

module.exports = function(evt, cb, cmd) {
	if (cmd !== "now") {
		cb("Invalid request, 'now' required. Try help exit");
		return;
	}

	cservice.log("*** FORCEFUL TERMINATION REQUESTED ***".warn);
	cservice.log("Exiting now.".warn);

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

module.exports.control = function(){
	return "local";
};
