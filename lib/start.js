var cservice = require("../cluster-service"),
  cluster = require("cluster"),
  fs = require("fs"),
  path = require("path"),
  colors = require("colors"),
  util = require("util");

module.exports = exports = start;

start.prepArgs = prepArgs;

function start(options, masterCb) {
  var argv;
  if (cluster.isWorker === true) {
    // ignore starts if not master. do NOT invoke masterCb, as that is
    // reserved for master callback

    return;
  }

  if (arguments.length === 0) {
    argv = require("optimist").argv;

    options = argv; // use command-line arguments instead
    if (!("cli" in options)) {
      options.cli = true; // auto-enable cli if run from command-line
    }
    prepArgs(options);
    masterCb = masterCallback;
  }

  options = options || {};
  if ("config" in options) {
    // only extend with config, do not overwrite command-line options
    var fileOptions = JSON.parse(fs.readFileSync(options.config));
    options = util._extend(fileOptions, options);
  }
  cservice.locals.options = util._extend(cservice.locals.options, options);
  if ("workers" in options) { // overwrite workers if provided
    cservice.locals.options.workers = options.workers;
  }
  options = cservice.locals.options;
  if (typeof options.workers === "string") {
    options.workers = {
      main: {
        worker: options.workers
      }
    };
  }
  if (options.commands) {
    cservice.registerCommands(options.commands);
  }

  colors.setTheme(options.colors);

  require("./legacy");

  if (options.run) {
    require("./run").start(options, function(err, result) {
      if (masterCb && masterCb(err, result) === false) {
        return; // do not exit if cb returns false
      }
      process.exit(0); // graceful exit
    });
  } else {
    require("./master").start(options, masterCb);
  }
}

function masterCallback(err) {
  if (err) {
    cservice.error(err);
    cservice.log("Startup failed, exiting...".warn);
    process.exit(0); // graceful exit
  }
}

function prepArgs(options) {
  var ext;
  if (options._ && options._.length > 0) {
    ext = path.extname(options._[0]).toLowerCase();
    if (ext === ".js") { // if js file, use as worker
      options.workers = options._[0];
    } else if (ext === ".json") { // if json file, use as config
      options.config = options._[0];
    } else { // otherwise assume it is a command to execute
      options.run = options._[0];
      if (options.json === true) {
        options.cli = false;
      }
    }
  }
}
