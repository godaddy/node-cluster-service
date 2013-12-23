var async = require("async"),
  util = require("util"),
  extend = require("extend"),
  cservice = require("../../cluster-service");

module.exports = function(evt, cb, cmd, workerPath, options) {
  var pid = parseInt(cmd);
  var originalAutoRestart;
  var workers;
  var tasks;
  var w;
  var worker;
  var workerOptions;

  options = options || {};
  options.timeout = parseInt(options.timeout) || 60000;
  options.worker = workerPath;
  if (typeof workerPath !== "string" || (cmd !== "all" && !pid)) {
    cb("Invalid request. Try help upgrade");
    return;
  }

  evt.locals.reason = "upgrade";
  originalAutoRestart = evt.locals.restartOnFailure;
  evt.locals.restartOnFailure = false;

  workers = evt.service.workers;
  tasks = [];

  for (w in workers) {
    worker = workers[w];
    if (pid && worker.process.pid !== pid) {
      continue; // cannot kill external processes
    }

    // use original worker options as default, by overwrite using new options
    workerOptions = extend(true, {}, worker.cservice, options);

    tasks.push(getTask(evt, worker, workerOptions));
  }

  if (tasks.length === 0) {
    cb("No workers to upgrade");
  } else {
    cservice.log("Upgrading workers... timeout: " + (options.timeout || 0));

    async.series(tasks, function(err) {
      evt.locals.restartOnFailure = originalAutoRestart;

      if (err) {
        cb(err);
      } else {
        cb(null, tasks.length + " workers upgraded successfully");
      }
    });
  }
};

module.exports.more = function(cb) {
  cb(null, {
    info: "Gracefully upgrade service, one worker at a time.",
    command: "upgrade all|pid workerPath { \"option1\": \"value\" }",
    "all|pid": [
      "Required. 'all' to force shutdown of all workers, otherwise the pid of",
      "the specific worker to upgrade"
    ].join(' '),
    "workerPath":[
      "Path of worker file (i.e. /workers/worker) to start, absolute path, or",
      "relative to cwd."
    ].join(' '),
    "options": "An object of options.",
    "* cwd":[
      "Path to set as the current working directory. If not provided, existing",
      "cwd will be used."
    ].join(' '),
    "* timeout": [
      "Timeout, in milliseconds, before terminating replaced workers. 0 for",
      "infinite wait."
    ].join(' ')
  });
};

function getTask(evt, worker, options) {
  return function(cb) {

    // kill new worker if takes too long
    var newKiller = null;
    var newWorker;
    var exitListener = function() {
      if (newKiller) {
        clearTimeout(newKiller);
      }
    };
    var killer;

    if (options.timeout > 0) { // start timeout if specified
      newKiller = setTimeout(function() {
        newWorker.removeListener("exit", exitListener);// remove temp listener
        newWorker.kill("SIGKILL"); // go get'em, killer
        cb("timed out");
      }, options.timeout);
    }

    // lets start new worker
    newWorker = evt.service.newWorker(options, function(err, newWorker) {
      newWorker.removeListener("exit", exitListener); // remove temp listener
      if (newKiller) { // timeout no longer needed
        clearTimeout(newKiller);
      }

      // ok, lets stop old worker
      killer = null;
      if (options.timeout > 0) { // start timeout if specified
        killer = setTimeout(function() {
          worker.kill("SIGKILL"); // go get'em, killer
        }, options.timeout);
      }

      worker.on("exit", function() {
        if (killer) {
          clearTimeout(killer);
        }

        // exit complete, fire callback
        setTimeout(cb, 250); // slight delay in case other events are piled up
      });

      if (worker.cservice.onStop === true) {
        worker.send({cservice: {cmd: "onWorkerStop"}});
      } else {
        worker.kill("SIGTERM"); // exit worker
      }

    });
  };
}
