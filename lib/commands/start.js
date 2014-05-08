var async = require("async"),
  util = require("util"),
  cservice = require("../../cluster-service");

module.exports = function(evt, cb, workerPath, options) {
  var tasks;
  var i;
  
  options = options || {};
  options.cwd = options.cwd || process.cwd();
  options.count = parseInt(options.count) || 1;
  options.timeout = parseInt(options.timeout) || 60000;
  options.worker = workerPath;
  if (typeof workerPath !== "string" || options.count < 1) {
    cb("Invalid request. Try help start");
    return;
  }

  evt.locals.reason = "start";
  var originalAutoRestart = evt.locals.restartOnFailure;
  evt.locals.restartOnFailure = false;

  tasks = [];

  cservice.log("Starting workers... timeout: " + (options.timeout || 0));

  for (i = 0; i < options.count; i++) {
    tasks.push(getTask(evt, options));
  }

  async.series(tasks, function(err) {
    evt.locals.restartOnFailure = originalAutoRestart; // restore

    if (err) {
      cb(err);
    } else {
      cb(null, tasks.length + " workers started successfully");
    }
  });
};

module.exports.more = function(cb) {
  cb(null, {
    info: "Gracefully start service, one worker at a time.",
    command: "start workerPath { \"option1\": \"value\" }",
    "workerPath": [
      "Path of worker file (i.e. /workers/worker) to start, absolute path, or",
      "relative to cwd."
    ].join(' '),
    "options": "An object of options.",
    "* cwd": [
      "Path to set as the current working directory. If not provided, existing",
      "cwd will be used."
    ].join(' '),
    "* count": "The number of workers to start, or 1 if not specified.",
    "* timeout": [
      "Timeout, in milliseconds, before terminating replaced workers. 0 for",
      "infinite wait."
    ].join(' '),
    "* ready":
      "If false, will wait for workerReady event before assuming success."
  });
};

function getTask(evt, options) {
  return function(cb) {
    // kill new worker if takes too long
    var newKiller = null;
    var newWorker;
    var exitListener = function() {
      if (newKiller) {
        clearTimeout(newKiller);
      }
    };

    if (options.timeout > 0) { // start timeout if specified
      newKiller = setTimeout(function() {
        if (!newWorker)
          return;
        newWorker.removeListener("exit", exitListener); // remove temp listener
        newWorker.kill("SIGKILL"); // go get'em, killer
        cb("timed out");
      }, options.timeout);
      newKiller.unref();
    }

    // lets start new worker
    newWorker = evt.service.newWorker(options, function(err, newWorker) {
      if (newWorker) { // won't exist if failure
        newWorker.removeListener("exit", exitListener); // remove temp listener
      }
      if (newKiller) { // timeout no longer needed
        clearTimeout(newKiller);
        newKiller = null;
      }

      cb(err);

    });
  };
}
