/* jshint loopfunc:true */
var cservice = require("../cluster-service"),
  cluster = require("cluster"),
  httpserver = require("./http-server"),
  async = require("async"),
  path = require("path"),
  startRequests = []; // queued start requests

exports.start = startMaster;

function startMaster(options, cb) {
  var workersRemaining;
  var workersForked;
  var workers;
  var i;
  var workerName;
  var worker;
  var workerCount;

  options = options || {};
  options.workerCount = options.workerCount || 1;

  if (cservice.locals.state === 0) { // one-time initializers
    cservice.locals.state = 1; // starting

    require("./commands/version")({}, function(err, ver) {
      cservice.log("cluster-service v".info + ver.data + " starting...".info);
    });

    /*process.on("uncaughtException", function(err) {
     cservice.log("uncaughtException", util.inspect(err));
     });*/

    // queue up our request
    startRequests.push(function() {
      startMaster(options, cb);
    });

    startListener(options, function(err) {
      var i;
      if (err) {
        cservice.locals.isAttached = true;

        // start the http client
        require("./http-client").init(options);
      } else { // we're the single-master
        cservice.locals.isAttached = false;

        cluster.setupMaster({silent: (options.silent === true)});

        cluster.on("online", function(worker) {
          cservice.trigger("workerStart", worker);
        });
        cluster.on("exit", function(worker, code, signal) {
          // stop tracking
          var version = cservice.locals.proxy.versions[worker.cservice.version];
          if (version) {
            // get all proxy workers for a specific version
            var versionWorkers =
              cservice.proxy.getVersionWorkers(worker.cservice.version);
            // exclude our exiting worker process in case it's still returned
            versionWorkers = versionWorkers.filter(function(versionWorker) {
              return worker.process.pid !== versionWorker.process.pid;
            });

            if (versionWorkers.length === 0) {
              // if no workers remain for a given version, drop the version
              delete cservice.locals.proxy.versions[worker.cservice.version];

              // inform proxy workers of version change
              cservice.proxy.updateProxyWorkers();
            }
          }
          delete cservice.locals.workerProcesses[worker.process.pid];

          cservice.trigger("workerExit", worker);
          // do not restart if there is a reason, or disabled
          if (
            !(cservice.locals.reason || worker.cservice.reason)
            && worker.suicide !== true
            && cservice.locals.restartOnFailure === true
          ) {
            setTimeout(function() {
              // lets replace lost worker.
              cservice.newWorker(worker.cservice);
            }, options.restartDelayMs);
          }
        });

        // start monitor
        monitorWorkers();

        if (options.cli === true) {
          // wire-up CLI
          require("./cli").init(options);
        }
      }

      cservice.proxy.start({}, function() {
        cservice.locals.state = 2; // running

        // now that listener is ready, process queued start requests
        for (i = 0; i < startRequests.length; i++) {
          startRequests[i](); // execute
        }
        startRequests = [];
      });
    });
  } else if (cservice.locals.state === 1) { // if still starting, queue requests
    startRequests.push(function() {
      startMaster(options, cb);
    });
  // if we're NOT attached, we can spawn the workers now
  } else if (cservice.locals.isAttached === false) {
    // fork it, i'm out of here
    workersRemaining = 0;
    workersForked = 0;

    if (options.workers !== null) {
      workers = typeof options.workers === "string"
        ? {main: {worker: options.workers}}
        : options.workers;
      for (workerName in workers) {
        worker = workers[workerName];
        workerCount = worker.count || options.workerCount;
        workersRemaining += workerCount;
        workersForked += workerCount;
        for (i = 0; i < workerCount; i++) {
          cservice.newWorker(worker, function(err) {
            workersRemaining--;
            if (err) {
              workersRemaining = 0; // callback now
            }
            if (workersRemaining === 0) {
              if (typeof options.master === "string") {
                require(path.resolve(options.master));
              }
              if(cb){
                cb(err);
              }
            }
          });
        }
      }
    }

    // if no forking took place, make sure cb is invoked
    if (workersForked === 0) {
      cservice.log("No workers running. Try 'start server.js'.".info);
      if(cb){
        cb();
      }
    }
  } else { // nothing else to do
    if(cb){
      cb();
    }
  }
}

function startListener(options, cb) {
  if (typeof options.accessKey === "undefined") { // in-proc mode only
    cservice.log(
      [
        "LOCAL ONLY MODE. Run with 'accessKey' option to enable communication",
        "channel."
      ]
      .join(' ')
      .info
      );
    cb();
    return;
  } else {
    options.accessKey = options.accessKey.toString();
    require("./control").setAccessKey(options.accessKey);
  }

  httpserver.init(options, function(err) {
    if (!err) {
      cservice.log(
        ("Listening at "
          + (
            (options.ssl ? "https://" : "http://")
            + options.host
            + ":"
            + options.port
            + "/cli"
            )
          .data
          )
        .info
        );
    }

    cb(err);
  });
}

function monitorWorkers() {
  if (cservice.options.restartOnMemUsage || cservice.options.restartOnUpTime) {
    setTimeout(onMonitorWorkers, 20000).unref(); // do not hold server open
  }
}

function onMonitorWorkers() {
  cservice.trigger("workers", function(err, results) {
    var workers;
    var restarts;
    var memUsage;
    var upTime;
    var i;
    var w;

    if (err || !results || !results.workers) {
      // nothing we can do about it at this time
      setTimeout(onMonitorWorkers, 60000).unref(); // do not hold server open
      return;
    }
    workers = results.workers;
    restarts = [];
    memUsage = cservice.options.restartOnMemUsage;
    upTime = cservice.options.restartOnUpTime;
    for (i = 0; i < workers.length; i++) {
      w = workers[i];
      if (
        (memUsage && w.process.memory.rss > memUsage)
        ||
        (upTime && w.process.uptime > upTime)
        ) {
        restarts.push(getWorkerToRestart(w));
      }
    }
    if (restarts.length > 0) {
      async.series(restarts, function(err, results) {
        setTimeout(onMonitorWorkers, 20000).unref(); // do not hold server open
      });
    } else {
      setTimeout(onMonitorWorkers, 30000).unref(); // do not hold server open
    }
  }, "simple");
}

function getWorkerToRestart(worker) {
  return function(cb) {
    cservice.trigger("restart", cb, worker.pid);
  };
}
