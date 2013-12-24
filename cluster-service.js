var cluster = require("cluster");
var colors = require("colors");
var locals = require("./lib/defaults");

module.exports = exports;

exports.debug = require("./lib/util").debug;
exports.log = require("./lib/util").log;
exports.error = require("./lib/util").error;
exports.results = require("./lib/util").results;

exports.workerReady = require("./lib/worker-ready");

Object.defineProperty(exports, "workers", {
  get: require("./lib/workers").get
});

Object.defineProperty(exports, "isMaster", {
  get: function() {
    return cluster.isMaster;
  }
});

Object.defineProperty(exports, "isWorker", {
  get: function() {
    return cluster.isWorker;
  }
});

Object.defineProperty(exports, "options", {
  get: function() {
    return locals.options;
  }
});

Object.defineProperty(exports, "locals", {
  get: function() {
    return locals;
  }
});

if (cluster.isMaster === true) {
  exports.control = require("./lib/control").addControls;
  exports.stop = require("./lib/stop");
  exports.trigger = require("./lib/trigger");
  exports.newWorker = require("./lib/new-worker");
  exports.on = require("./lib/on");
} else {
  exports.on = function() {
  };
}

exports.start = require("./lib/start");

if (
  cluster.isWorker === true
  && typeof (cluster.worker.module) === "undefined"
){
  // intermediate state to prevent 2nd call while async in progress
  cluster.worker.module = {};
  // load the worker if not already loaded
  // async, in case worker loads cluster-service, we need to return before 
  // it's avail
  setTimeout(function() {
    cluster.worker.module = require(process.env.worker);
  }, 10);

  // start worker monitor to establish two-way relationship with master
  require("./lib/workers").monitor();
}
