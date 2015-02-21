var cservice = require("../cluster-service"),
  cluster = require("cluster");

exports.get = get;
exports.monitor = monitor;
exports.getByPID = getByPID;
exports.exitGracefully = exitGracefully;

function get() {
  var workers = [];
  var cworkers = cluster.workers;
  var k;
  var worker;
  for (k in cworkers) {
    worker = cworkers[k];
    if (!worker.isDead || !worker.isDead()) {
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

function monitor() {
  process.on("message", function(msg) {
    if (!msg || typeof msg.cservice !== "string") {
      return; // end
    }

    switch (msg.cservice) {
      case "processDetails":
        process.send({
          cservice: "processDetails",
          processDetails: {
            memory: process.memoryUsage(),
            title: process.title,
            uptime: process.uptime(),
            hrtime: process.hrtime()
          }
        });
        break;
    }
  });
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
  worker.send({cservice: {cmd: "onWorkerStop"}});
}
