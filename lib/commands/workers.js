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
    var timer, msgCb, processDetails, netStats;
    msgCb = function (msg) {
      if (msg && msg.processDetails) {
        processDetails = msg.processDetails;
      }
      if (msg && msg.netStats) {
        netStats = msg.netStats;
      }
      if (processDetails && netStats) {
        clearTimeout(timer);
        worker.removeListener("message", msgCb);
        worker.processDetails = processDetails;
        processDetails.net = netStats;
        cb(null, worker);
      }
    };
    timer = setTimeout(function() {
      worker.removeListener("message", msgCb);
      if (processDetails) { // net stats not required for success
        worker.processDetails = processDetails;
        cb(null, worker);
      } else {
        cb("getProcessDetails TIMEOUT");
      }
    }, 1000);

    worker.on("message", msgCb);
    worker.process.send({cservice: "processDetails"});
    worker.process.send({cservice: "netStats"});
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
