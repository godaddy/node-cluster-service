/* jshint loopfunc:true */

var util = require("util"),
  cservice = require("../../cluster-service");

module.exports = function(evt, cb, cmd, options) {
  var pid = parseInt(cmd);
  var workersToKill;
  var exiting;

  options = options || {};
  options.timeout = parseInt(options.timeout) || 60000;
  if (cmd !== "all" && !pid) {
    cb("Invalid request. Try help shutdown");
    return;
  }

  evt.locals.reason = "shutdown";

  workersToKill = 0;

  exiting = false;
  evt.service.workers.forEach(function(worker){
    if (pid && worker.process.pid !== pid) {
      return; // cannot kill external processes
    }

    exiting = true;
    workersToKill++;

    var killTimeout = options.timeout > 0
      ? setTimeout(getKiller(worker), options.timeout)
      : null;
    worker.on("exit", getExitHandler(evt, worker, killTimeout, function() {
      workersToKill--;
      if (workersToKill === 0) {
        // no workers remain
        if (evt.service.workers.length === 0) {
          evt.locals.reason = "kill";
          cservice.log("All workers shutdown. Exiting...".warn);
          evt.service.stop(options.timeout, cb);
        } else {
          cb(null, "Worker shutdown"); // DONE
        }
      }
    }));

    require("../workers").exitGracefully(worker);
  });

  if (exiting === false) {
    if (evt.service.workers.length === 0) {
      evt.locals.reason = "kill";
      cservice.log("All workers shutdown. Exiting...");
      evt.service.stop(options.timeout, cb);
    } else {
      cb("No workers were shutdown");
    }
  } else {
    cservice.log(
      "Killing workers... timeout: ".warn +
      (options.timeout || 0).toString().info
    );
  }
};

module.exports.more = function(cb) {
  cb(null, {
    info: [
      "Gracefully shutdown service, waiting up to timeout before terminating",
      "workers."
    ].join(' '),
    command: "shutdown all|pid { \"option1\": \"value\" }",
    "all|pid": [
      "Required. 'all' to force shutdown of all workers, otherwise the pid of",
      "the specific worker to shutdown"
    ].join(' '),
    "options": "An object of options.",
    "* timeout": [
      "Timeout, in milliseconds, before terminating workers. 0 for infinite",
      "wait."
    ].join(' ')
  });
};

module.exports.control = function() {
  return "local";
};

function getKiller(worker) {
  return function() {
    worker.kill("SIGKILL"); // go get'em, killer
  };
}

function getExitHandler(evt, worker, killer, cb) {
  return function() {
    if (killer) {
      clearTimeout(killer);
    }

    cb();
  };
}