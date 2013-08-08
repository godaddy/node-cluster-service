var
	cservice = require("../cluster-service")
;

module.exports = function(evt, cb) {
	cb(null, cservice.options);
};

module.exports.more = function(cb) {
	cb(null, {
		command: "options",
		info: "Returns the options the service was initialized with. May be overidden by service to expose app-specific options."
	});
};
