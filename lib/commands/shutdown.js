/* jshint loopfunc:true */

var util = require("util"),
  cservice = require("../../cluster-service");

module.exports = function(evt, cb, cmd, options) {
  var pid = parseInt(cmd);
  var workersToKill;
  var workers;
  var exiting;
  var w;
  var worker;
  options = options || {};
  options.timeout = parseInt(options.timeout) || 60000;
  if (cmd !== "all" && !pid) {
    cb("Invalid request. Try help shutdown");
    return;
  }

  evt.locals.reason = "shutdown";

  workersToKill = 0;

  workers = evt.service.workers;
  exiting = false;
  for (w in workers) {
    worker = workers[w];
    if (pid && worker.process.pid !== pid) {
      continue; // cannot kill external processes
    }

    exiting = true;
    workersToKill++;

    worker.process.on(
      "exit",
      getExitHandler(
        evt
        , worker
        , options.timeout > 0
          ? setTimeout(getKiller(worker), options.timeout)
          : null
        , function() {
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
        }
      )
    );
    if (worker.onWorkerStop === true) { // try the nice way first
      worker.send({cservice: {cmd: "onWorkerStop"}});
    } else {
      worker.kill("SIGTERM"); // exit worker
    }
  }

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
      killer = null;
    }

    cb();
  };
}