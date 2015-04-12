var cservice = require("../../cluster-service");

module.exports = function(evt, cb, cmd) {
  var versionStr, options;
  switch (cmd) {
    case "start":
      cservice.proxy.start({ configPath: arguments[3] }, cb);
      break;
    case "stop":
      cservice.proxy.stop(cb);
      break;
    case "version":
      versionStr = arguments[3];
      options = {};
      if (arguments[4]) {
        options.workerCount = parseInt(arguments[4]);
      }
      cservice.proxy.version(versionStr, options, cb);
      break;
    case "promote":
      versionStr = arguments[3];
      options = {};
      if (arguments[4]) {
        options.workerCount = parseInt(arguments[4]);
      }
      cservice.proxy.promote(versionStr, options, cb);
      break;
    case "info":
      cservice.proxy.info(cb);
      break;
    default:
      cb("Proxy command " + cmd +
        " not recognized. Try 'help proxy' for more info.");
      break;
  }
};

module.exports.more = function(cb) {
  cb(null, {
    command: "proxy {cmd} {options}",
    info: "Perform a proxy operation.",
    cmd: "Available commands:",
    "* start {configPath}": "Start proxy",
    "* stop": "Stop proxy",
    "* version {version} {workerCount}":
      "Set a given version to desired worker count",
    "* promote {version} [workerCount]": "Promote a worker version",
    "* info": "Return proxy info, including a list of active versions",
    "options": "Available options:",
    "* configPath": "Path of proxy config file",
    "* version": "Worker version (path)",
    "* workerCount": "Desired number of workers"
  });
};

module.exports.control = function() {
  return "local";
};
