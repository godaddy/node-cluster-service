var util = require("util");

module.exports = function(evt, cb, cmdName) {
  var evtName, cmd, ret = {};
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
    for (evtName in evt.locals.events) {
      cmd = evt.locals.events[evtName];
      if (cmd.cb.visible === false)
        continue;
      ret.commands.push(evtName);
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

module.exports.control = function() {
  return "local";
};
