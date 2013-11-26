var
	util = require("util")
;

module.exports = function(evt, cb, cmdName) {
	var evt_name, cmd, line_idx = 0;
	var ret = { };
	if (typeof cmdName === "string") {
		ret.command = cmdName;
		cmd = evt.locals.events[cmdName];
		if (!cmd) {
			ret.err = "Command not found";
		} else {
			if (typeof cmd.cb.more === "function") {
				cmd.cb.more(function(err, result) {
					cb(null, result);
				});
				return;
			} else {
				ret.more = "No additional details found.";
			}
		}
	} else { // full listing
		ret.more = "Commands (Use 'help [command_name]' for more details)";
		ret.commands = [];
		for (evt_name in evt.locals.events) {
			cmd = evt.locals.events[evt_name];
			ret.commands.push(evt_name);
		}
	}

	cb(null, ret);
};

module.exports.more = function(cb) {
	cb(null, {
		"command": "help [command_name]",
		"command_name": "Optional if you want extended help"
	});
};