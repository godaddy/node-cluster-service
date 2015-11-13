var cluster = require("cluster");
var colors = require("colors");
if (!('cservice' in global)) {
  global.cservice = { locals: require("./lib/defaults") };
}

module.exports = exports;

exports.debug = require("./lib/util").debug;
exports.log = require("./lib/util").log;
exports.error = require("./lib/util").error;
exports.results = require("./lib/util").results;
exports.processSafeSend = require("./lib/util").processSafeSend;
exports.msgBus = require("./lib/message-bus");

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
    return global.cservice.locals.options;
  }
});

Object.defineProperty(exports, "locals", {
  get: function() {
    return global.cservice.locals;
  }
});

if (cluster.isMaster === true) {
  exports.control = require("./lib/control").addControls;
  exports.stop = require("./lib/stop");
  exports.newWorker = require("./lib/new-worker");
  exports.on = require("./lib/commands").on;
  exports.registerCommands = require("./lib/commands").register;
} else {
  exports.on = function() { };
  exports.registerCommands = function() { };
}

exports.trigger = require("./lib/trigger");
exports.start = require("./lib/start");
exports.netServers = require("./lib/net-servers");
exports.netStats = require("./lib/net-stats");
exports.proxy = require('./lib/proxy');

if (
  cluster.isWorker === true
  && typeof (cluster.worker.module) === "undefined"
){
  // intermediate state to prevent 2nd call while async in progress
  cluster.worker.module = {};
  cluster.worker.env = process.env;

  var workers = require("./lib/workers");

  workers.demote();

  // load the worker if not already loaded
  // async, in case worker loads cluster-service, we need to return before
  // it's avail
  setImmediate(function() {
    cluster.worker.module = require(process.env.worker);
    if (global.cservice.locals.workerReady === undefined
      && process.env.ready.toString() === "false") {
      // if workerReady not invoked explicitly, we'll track it automatically
      exports.workerReady(false);
      exports.netServers.waitForReady(function() {
        exports.workerReady(); // NOW we're ready
      });
    }
  });

  // start worker monitor to establish two-way relationship with master
  workers.monitor();
}
