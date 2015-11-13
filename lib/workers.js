var cservice = require("../cluster-service"),
  cluster = require("cluster");

exports.get = get;
exports.monitor = monitor;
exports.getByPID = getByPID;
exports.getByPIDFromCache = getByPIDFromCache;
exports.exitGracefully = exitGracefully;
exports.demote = demote;

function get() {
  var workers = [];
  var cworkers = cluster.workers;
  var k;
  var worker;
  for (k in cworkers) {
    worker = cworkers[k];
    if ((!worker.isDead || !worker.isDead())
      && worker.suicide !== true
      && worker.state !== "none") {
      worker.pid = worker.process.pid;
      workers.push(worker);
    }
  }

  workers.send = send;

  return workers;
}

// i hate O(N) lookups, but not hit hard enough to worry about optimizing at
// this point. freshness is more important
function getByPID(pid) {
  var workers = get();
  var i;
  var worker;

  for (i = 0; i < workers.length; i++) {
    worker = workers[i];
    if (worker.pid === pid) {
      return worker;
    }
  }
  // else return undefined
}

function getByPIDFromCache(pid) {
  return cservice.locals.workers[pid];
}

function monitor() {
  process.on("message", function(msg) {
    if (!cservice.msgBus.isValidMessage(msg)) {
      return; // end
    }

    switch (msg.cservice.cmd) {
      case "processDetails":
        cservice.processSafeSend(process,
          cservice.msgBus.createMessage("processDetails", {
            processDetails: {
              memory: process.memoryUsage(),
              title: process.title,
              uptime: process.uptime(),
              hrtime: process.hrtime()
            }
        }));
        break;
    }
  });
}

function demote() {
  // only demote if:
  // 1. process.getgid is defined (not Windows)
  // 2. Running as root
  // 3. workerGid is string and not a proxy worker
  var gid = cservice.options.workerGid || 'nobody';
  var uid = cservice.options.workerUid || 'nobody';
  if (process.getgid && process.getgid() === 0) {
    if ( // but do not auto-demote proxy
         // workers as they require priveledged port access
      cluster.worker.env.type !== "proxy" &&
      typeof cservice.options.workerGid === 'string'
    ) {
      process.setgid(gid);
      process.setuid(uid);
    } else {
      cservice.log(
        "Worker running as root. Not advised for Production." +
        " Consider workerGid & workerUid options.".warn
      );
    }

  }

}

/**
 * This is shorthand for:
 * <pre>
 *  module.workers.forEach(function(worker){...});
 * </pre>
 */
function send(){
  this.forEach(function(worker){
    worker.send.apply(worker, [].slice.apply(arguments));
  });
}

function exitGracefully(worker) {
  // inform the worker to exit gracefully
  worker.send(cservice.msgBus.createMessage("onWorkerStop"));
}
