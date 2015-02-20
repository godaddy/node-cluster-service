var async = require("async"),
    util = require("util"),
    cservice = require("../../cluster-service"),
    killWorker = require('../util').killWorker;

module.exports = function(evt, cb, cmd, options) {
  var pid = parseInt(cmd),
      originalAutoRestart,
      tasks;
  options = options || {};
  options.timeout = parseInt(options.timeout) || 60000;
  if (cmd !== "all" && !pid) {
    cb("Invalid request. Try help restart");
    return;
  }

  evt.locals.reason = "restart";
  originalAutoRestart = evt.locals.restartOnFailure;
  evt.locals.restartOnFailure = false;

  tasks = [];

  evt.service.workers.forEach(function(worker){
    if (pid && worker.process.pid !== pid) {
      return; // cannot kill external processes
    }

    tasks.push(getTask(evt, worker, options, (pid ? true : false)));
  });

  if (tasks.length === 0) {
    cb("No workers to restart");
  } else {
    cservice.log(
      "Restarting workers... timeout: ".warn + options.timeout.toString().info
    );

    async.series(tasks, function(err) {
      evt.locals.restartOnFailure = originalAutoRestart; // restore

      if (err) {
        cb(err);
      } else {
        cb(null, tasks.length + " workers restarted successfully");
      }
    });
  }
};

module.exports.more = function(cb) {
  cb(null, {
    info: [
      "Gracefully restart service, waiting up to timeout before terminating",
      "workers."
    ].join(' '),
    command: "restart all|pid { \"option1\": \"value\" }",
    "all|pid": [
      "Required. 'all' to force shutdown of all workers, otherwise the pid of",
      "the specific worker to restart"
    ].join(' '),
    "options": "An object of options.",
    "* timeout": [
      "Timeout, in milliseconds, before terminating workers.",
      "0 for infinite wait."
    ].join(' ')
  });
};

function getTask(evt, worker, options, explicitRestart) {
  return function(cb) {
    var newWorker = null;

    if (worker.cservice.restart === false && explicitRestart === false) {
      cservice.log(
        "Worker process " + worker.process.pid + " immune to restarts"
      );
      cb();
      return;
    }

    // kill new worker if takes too long
    var newKiller = null;
    if (options.timeout > 0) { // start timeout if specified
      newKiller = setTimeout(function() {
        killWorker(newWorker, function () {
          cb("timed out");
        });
      }, options.timeout);
    }

    // lets start new worker
    newWorker = evt.service.newWorker(worker.cservice, function(err) {
      newWorker = null;
      if (newKiller) { // timeout no longer needed
        clearTimeout(newKiller);
      }

      if (worker.isDead && worker.isDead()) {
        return void cb();
      }

      // ok, lets stop old worker
      var killer = null;
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
        setTimeout(cb, 100); // slight delay in case other events are piled up
      });

      require("../workers").exitGracefully(worker);
    });
  };
}
