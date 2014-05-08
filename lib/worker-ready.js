var cservice = require("../cluster-service"),
  cluster = require("cluster"),
  util = require("util"),
  onWorkerStop = null;

module.exports = exports = workerReady;

function workerReady(options, forceIsWorker) {
  if (cluster.isMaster === true && forceIsWorker !== true) {
    return; // ignore if coming from master
  }

  if (cservice.locals.workerReady === true) {
    return; // ignore dup calls
  }

  if (options === false) {
    cservice.locals.workerReady = false;

    return; // do not continue
  }

  cservice.locals.workerReady = true;

  options = options || {};

  if (options.servers) {
    require("./net-servers").netServersAdd(options.servers);
  }
  
  onWorkerStop = options.onWorkerStop;

  process.on("message", onMessageFromMaster);

  // allow worker to inform the master when ready to speed up initialization  
  process.send({
    cservice: {
      cmd: "workerReady",
      onStop: (typeof options.onWorkerStop === "function")
    }
  });
}

function onMessageFromMaster(msg) {
  if (!msg || !msg.cservice || !msg.cservice.cmd) {
    return; // ignore invalid cluster-service messages
  }

  switch (msg.cservice.cmd) {
    case "onWorkerStop":
      cservice.netServers.close(function() {
        if (typeof onWorkerStop === "function") {
          // if custom handler is provided rely on that to
          // cleanup and exit process
          onWorkerStop();
        } else {
          // otherwise we can exit now that net servers have exited gracefully
          process.exit();
        }
      });
      break;
  }
}
