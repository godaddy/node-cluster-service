var async = require("async"),
  util = require("util"),
  cservice = require("../../cluster-service");

module.exports = function(evt, cb, cmd, workerPath, options) {
  var pid = parseInt(cmd);
  var originalAutoRestart;
  var tasks;
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

  tasks = [];

  evt.service.workers.forEach(function(worker){
    if (pid && worker.process.pid !== pid) {
      return; // cannot kill external processes
    }

    // use original worker options as default, by overwrite using new options
    workerOptions = util._extend(util._extend({}, worker.cservice), options);

    tasks.push(getTask(evt, worker, workerOptions));
  });

  if (tasks.length === 0) {
    cb("No workers to upgrade");
  } else {
    cservice.log("Upgrading workers... timeout: " + (options.timeout || 0));

    var limit = 1 +
        Math.floor(
            tasks.length * cservice.options.restartConcurrencyRatio
        );
    async.parallelLimit(tasks, limit, function(err) {
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

    var pendingWorker;

    // kill new worker if takes too long
    var newWorkerTimeout = null;
    var isNewWorkerTerminated = false;
    if (options.timeout > 0) { // start timeout if specified
      newWorkerTimeout = setTimeout(function() {
        if (!pendingWorker) return;

        isNewWorkerTerminated = true;
        pendingWorker.on('exit', function () {
          cb("timed out");
        });
        pendingWorker.kill("SIGKILL"); // go get'em, killer
      }, options.timeout);
    }

    // lets start new worker
    pendingWorker = evt.service.newWorker(options, function (err) {
      pendingWorker = null;
      if (newWorkerTimeout) { // timeout no longer needed
        clearTimeout(newWorkerTimeout);
      }

      if (err) {
        cb(err);
        return;
      }

      // ok, lets stop old worker
      var oldWorkerTimeout = null;
      if (options.timeout > 0) { // start timeout if specified
        oldWorkerTimeout = setTimeout(function() {
          worker.kill("SIGKILL"); // go get'em, killer
        }, options.timeout);
      }

      worker.on("exit", function() {
        if (oldWorkerTimeout) {
          clearTimeout(oldWorkerTimeout);
        }

        // exit complete, fire callback
        setImmediate(cb); // slight delay in case other events are piled up
      });

      require("../workers").exitGracefully(worker);
    });
  };
}
