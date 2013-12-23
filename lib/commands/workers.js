var async = require("async"),
  extend = require("extend");

module.exports = function(evt, cb, cmd) {
  processDetails(evt.service.workers, function(err, workers) {
    var ret = {};
    cmd = cmd || "simple";
    switch (cmd) {
      case "details":
        ret.workers = workers;
        break;
      default:
        ret.workers = workerSummary(workers);
        break;
    }

    cb(err, ret);
  });
};

module.exports.more = function(cb) {
  cb(null, {
    command: "workers [simple|details]",
    info: "Returns list of active worker processes.",
    "simple|details": "Defaults to 'simple'.",
    "* simple": "Simple overview of running workers.",
    "* details": "Full details of running workers."
  });
};

function processDetails(workers, cb) {
  var tasks = [], i, w;

  for (i = 0; i < workers.length; i++) {
    w = workers[i];
    tasks.push(getProcessDetails(w));
  }
  async.parallel(tasks, function(err, results) {
    cb(err, workers);
  });
}

function getProcessDetails(worker) {
  return function(cb) {
    worker.once("message", function(msg) {
      if (!msg || !msg.processDetails) {
        cb("processDetails not returned");
        return; // end
      }

      worker.processDetails = msg.processDetails;
      cb(null, worker);
    });
    // todo! timeout needed? perhaps.
    worker.process.send({cservice: "processDetails"});
  };
}

function workerSummary(workers) {
  var ret = [], i, w;

  for (i = 0; i < workers.length; i++) {
    w = workers[i];
    ret.push({
      id: w.id,
      pid: w.pid,
      state: w.state,
      worker: w.cservice.worker,
      cwd: w.cservice.cwd,
      process: w.processDetails
    });
  }

  return ret;
}
