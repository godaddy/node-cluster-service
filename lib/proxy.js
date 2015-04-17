var cservice = require("../cluster-service");
var cluster = require("cluster");
var workersHelper = require("./workers");
var path = require("path");
var async = require("async");
var fs = require("fs");

module.exports = {
  start: start,
  stop: stop,
  version: version,
  promote: promote,
  updateProxyWorkers: updateProxyWorkers,
  getProxyWorkers: getProxyWorkers,
  getVersionWorkers: getVersionWorkers,
  info: info
};

function start(options, cb) {
  if (cluster.isWorker === true) {
    cservice.log("Proxy cannot be started from worker".warn);
    return cb && cb("Proxy cannot be started from worker");
  }

  var configPath = options.configPath || cservice.options.proxy;

  if (typeof configPath !== "string") {
    // disabled
    return cb && cb();
  }

  if (cservice.locals.proxy.enabled === true) {
    cservice.log("Proxy already running".warn);
    return cb && cb("Proxy already running");
  }

  cservice.locals.proxy.configPath = path.resolve(configPath);
  cservice.locals.proxy.options =
    JSON.parse(fs.readFileSync(cservice.locals.proxy.configPath))
  ;

  options = cservice.locals.proxy.options;

  if (Array.isArray(options.bindings) === false ||
    options.bindings.length === 0) {
    options.bindings = [{ port: 80, workerCount: 2 }]; // default
  }

  options.nonDefaultWorkerCount = options.nonDefaultWorkerCount || 1;
  options.nonDefaultWorkerIdleTime = options.nonDefaultWorkerIdleTime || 3600;

  cservice.locals.proxy.versionPath =
    options.versionPath || path.dirname(cservice.locals.proxy.configPath)
  ;
  cservice.locals.proxy.versionPath =
    path.resolve(cservice.locals.proxy.versionPath)
  ;
  cservice.locals.proxy.workerFilename = options.workerFilename || "worker.js";
  cservice.locals.proxy.versionHeader = options.versionHeader || "x-version";

  var portRange = (options.versionPorts || "11000-12000").split("-");
  cservice.locals.proxy.portRange = {
    min: parseInt(portRange[0]),
    max: parseInt(portRange[1])
  };
  cservice.locals.proxy.nextAvailablePortIndex = 0;

  var proxyWorkerTasks = options.bindings.map(function(b) {
    return function(cb) {
      var workerOptions = {
        type: "proxy", // proxy worker type
        worker: path.resolve(__dirname, "proxy-worker.js"),
        bindingInfo: JSON.stringify(b),
        versionPath: cservice.locals.proxy.versionPath,
        versionHeader: cservice.locals.proxy.versionHeader,
        workerFilename: cservice.locals.proxy.workerFilename,
        versions: JSON.stringify(cservice.locals.proxy.versions),
        count: b.workerCount || 2
      };
      cservice.newWorker(workerOptions, cb);
    };
  });

  cservice.locals.proxy.refreshnessTimer =
    setInterval(checkVersionsForFreshness, 10000)
  ;
  cservice.locals.proxy.refreshnessTimer.unref();

  cservice.locals.proxy.enabled = true;

  async.parallel(proxyWorkerTasks, function (err) {
    var portArr = options.bindings.map(function(b) {
      return b.port.toString().data;
    });

    if (err) {
      cservice.error("Proxy failed to run on ports ".error +
        portArr.join(",".info) + " with error ".error + err.toString().data);
      return cb && cb(err);
    }

    cservice.log("Proxy running on ports ".info + portArr.join(",".info));

    if (!cservice.locals.proxy.options.defaultVersion) {
      // no current version

      return cb && cb();
    }

    version(cservice.locals.proxy.options.defaultVersion,
      { workerCount: cservice.locals.options.workerCount },
      function (err, version) {
      if (err) {
        cservice.error("Proxy failed to run on ports ".error +
          portArr.join(",".info) + " with error ".error + err.toString().data
        );
        return cb && cb(err);
      }

      return cb && cb();
    });
  });
}

function stop(cb) {
  if (cluster.isWorker === true) {
    cservice.log("Proxy cannot be stopped from worker".warn);
    return cb && cb("Proxy cannot be stopped from worker");
  }

  if (typeof cservice.locals.proxy.configPath !== "string") {
    // disabled
    return cb && cb();
  }

  if (cservice.locals.proxy.enabled === false) {
    cservice.log("Proxy not running".warn);
    return cb && cb("Proxy not running");
  }

  clearInterval(cservice.locals.proxy.refreshnessTimer);
  cservice.locals.proxy.refreshnessTimer = null;

  // now lets trigger a shutdown
  cservice.trigger("shutdown", function(err, result) {
    cservice.locals.proxy.enabled = false;
    return cb && cb();
  }, "all");
}

function version(versionStr, options, cb) {
  if (cluster.isWorker === true) {
    cservice.log("Proxy cannot invoke 'version' from worker".warn);
    return cb && cb("Proxy cannot invoke 'version' from worker");
  }

  options = options || {};
  if (isNaN(options.workerCount) === true) {
    options.workerCount =
      (versionStr === cservice.locals.proxy.options.defaultVersion)
      ? cservice.locals.options.workerCount
      : cservice.locals.proxy.options.nonDefaultWorkerCount
    ;
  }

  // detect current version worker count
  var currentVersionWorkers = getVersionWorkers(versionStr);

  // determine worker delta from desired count and actual count
  var workerCountDelta = options.workerCount - currentVersionWorkers.length;

  // get existing version listing
  var v = cservice.locals.proxy.versions[versionStr];

  if (v) {
    // update version lastAccess
    v.lastAccess = Date.now();
  }

  // if version worker count is already current, nothing more to do
  if (workerCountDelta === 0) {
    return cb && cb();
  }

  if (workerCountDelta < 0) {
    // if desired version count is less than current, reduce worker count
    var workersToShutdown = currentVersionWorkers.length - options.workerCount;
    var shutdownTasks = [];
    for (var workerToShutdown = 0; workerToShutdown < workersToShutdown;
      workerToShutdown++) {
      shutdownTasks.push(
        getWorkerShutdownTask(
          currentVersionWorkers[workerToShutdown],
          options.reason || "proxy version"
        )
      );
    }

    // shutdown all at once
    async.parallel(shutdownTasks, function (err, results) {
      return cb && cb(err);
    });

    return;
  }

  // if desired version count is more than current, spin up new workers

  var workerPath = path.resolve(cservice.locals.proxy.versionPath,
    versionStr, cservice.locals.proxy.workerFilename
  );

  // use existing port if available, otherwise allocate a new one
  var versionPort = (v && v.port) || getNextAvailablePort();

  cservice.trigger("start", function (err, result) {
    return cb && cb(err, result);
  }, workerPath, {
    count: workerCountDelta,
    version: versionStr,
    PROXY_PORT: versionPort
  });
}

function getWorkerShutdownTask(worker, reason) {
  return function(cb) {
    worker.cservice.reason = reason;
    cservice.trigger("shutdown", cb, worker.process.pid);
  };
}

function getNextAvailablePort() {
  // always continue where we left off from the last time
  // we fetched an available port.
  // this generally will allow us to return in O(1),
  // unless there are tons of active versions.
  var totalPorts = cservice.locals.proxy.portRange.max
    - cservice.locals.proxy.portRange.min
  ;
  for (var i = 0; i < totalPorts; i++) {
    var port = cservice.locals.proxy.portRange.min
      + ((cservice.locals.proxy.nextAvailablePortIndex + i) % totalPorts);
    if (isPortInUse(port) === false) {
      cservice.locals.proxy.nextAvailablePortIndex = ((i + 1) % totalPorts);
      return port;
    }
  }

  throw new Error(
    "All proxy ports have been used up! Try increasing range of " +
    "`proxy.versionPorts` or reducing `proxy.nonDefaultWorkerIdleTime`.");
}

function isPortInUse(port) {
  for (var k in cservice.locals.proxy.versions) {
    if (cservice.locals.proxy.versions.hasOwnProperty(k) === false) {
      continue; // ignore
    }
    if (cservice.locals.proxy.versions[k].port === port) {
      return true; // NOT available
    }
  }

  // if we get this far, we're OK to use port
  return false;
}

function promote(versionStr, options, cb) {
  if (cluster.isWorker === true) {
    cservice.log("Proxy cannot invoke 'promote' from worker".warn);
    return cb && cb("Proxy cannot invoke 'promote' from worker");
  }

  options = options || {};
  options.workerCount = options.workerCount ||
    cservice.locals.options.workerCount
  ;

  var oldVersion = cservice.locals.proxy.versions[
    cservice.locals.proxy.options.defaultVersion
  ];

  // set to-be-promoted version to desired worker count
  version(versionStr, options, function (err) {
    if (err) {
      // pass failure on
      return cb && cb(err);
    }

    // persist to-be-promoted version
    cservice.locals.proxy.options.defaultVersion = versionStr;
    fs.writeFile(cservice.locals.proxy.configPath,
      JSON.stringify(cservice.locals.proxy.options, null, "  "), function(err) {
      if (err) {
        // pass failure on
        cservice.error("Failed to proxy promote version".error +
          versionStr.info
        );
        return cb && cb(err);
      }

      // notify proxy-workers of promoted version
      updateProxyWorkers();

      cservice.log("Proxy promoted version ".success +
        versionStr.info +
        " successfully".success
      );

      // bring previously promoted version down to
      // `nonDefaultWorkerCount` workers, but no need to wait for callback
      if (oldVersion && oldVersion.name !== versionStr) {
        version(oldVersion.name,
          {
            workerCount: cservice.locals.proxy.options.nonDefaultWorkerCount,
            reason: "proxy demote"
          }, function(err) {
            if (err) {
              return cservice.error("Failed to proxy demote version".error +
                oldVersion.name.info
              );
            }

            cservice.log("Proxy demoted old version ".success +
              oldVersion.name.info +
              " successfully".success
            );
          }
        );
      }

      if (cb) {
        setImmediate(cb);
      }
    });
  });
}

function updateProxyWorkers() {
  var msg = cservice.msgBus.createMessage("proxyVersions", {
    versions: cservice.locals.proxy.versions,
    defaultVersion: cservice.locals.proxy.options.defaultVersion
  });
  getProxyWorkers().forEach(function(worker) {
    worker.send(msg);
  });
}

function info(cb) {
  if (cluster.isWorker === true) {
    cservice.log("Proxy cannot invoke 'info' from worker".warn);
    return cb && cb("Proxy cannot invoke 'info' from worker");
  }

  var now = Date.now();
  var proxyWorkers = getProxyWorkers().map(function(worker) {
    var bindingInfo = JSON.parse(worker.cservice.bindingInfo);
    return {
      port: bindingInfo.port,
      ssl: typeof bindingInfo.tlsOptions === "object"
    };
  });
  var versionWorkers = getVersionWorkers().map(function(worker) {
    var versionInfo = cservice.locals.proxy.versions[worker.cservice.version];
    return {
      worker: worker.cservice.worker,
      version: worker.cservice.version,
      lastAccess: versionInfo ?
        Math.round((now - versionInfo.lastAccess) / 1000) : "?"
    };
  });

  cb(null, {
    versionPath: cservice.locals.proxy.versionPath,
    workerFilename: cservice.locals.proxy.workerFilename,
    portRange: cservice.locals.proxy.portRange,
    options: cservice.locals.proxy.options,
    proxyWorkers: proxyWorkers,
    versionWorkers: versionWorkers
  });

}

function getProxyWorkers() {
  return cservice.workers.filter(function(worker) {
    return worker.cservice.type === "proxy";
  });
}

function getVersionWorkers(explicitVersion) {
  return cservice.workers.filter(function(worker) {
    var result =
      typeof worker.cservice.version === "string" &&
      (!explicitVersion || worker.cservice.version === explicitVersion)
    ;
    return result;
  });
}

function isVersionRunning(versionStr, cb) {
  if (!(versionStr in cservice.locals.proxy.versions)) {
    return false; // version not available
  }

  // are any worker processes running desired version?
  var workers = cservice.locals.workerProcesses;

  for (var i = 0; i < workers.length; i++) {
    var worker = workers[i];
    var pid = worker.process.pid;
  }

  return false; // no workers running desired version
}

function checkVersionsForFreshness() {
  var now = Date.now();
  for (var k in cservice.locals.proxy.versions) {
    if (
      // live version is exempt
      k === cservice.locals.proxy.options.defaultVersion ||
      // verify a valid version
      !cservice.locals.proxy.versions.hasOwnProperty(k)) {
      continue; // skip
    }
    var v = cservice.locals.proxy.versions[k];
    var diff = (now - v.lastAccess) / 1000; // seconds
    if (diff < cservice.locals.proxy.options.nonDefaultWorkerIdleTime) {
      continue; // all OK
    }

    cservice.log("Proxy version ".warn + k.info +
      " shutting down due to inactivity".warn
    );

    // kill all the things
    version(k, { workerCount: 0 });
  }
}
