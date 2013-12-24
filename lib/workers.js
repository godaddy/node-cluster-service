var cluster = require("cluster");

exports.get = get;
exports.monitor = monitor;
exports.getByPID = getByPID;

function get() {
  var workers = [];
  var cworkers = cluster.workers;
  var k;
  var worker;
  for (k in cworkers) {
    worker = cworkers[k];
    worker.pid = worker.process.pid;
    workers.push(worker);
  }

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
            memoryUsage: process.memoryUsage(),
            title: process.title,
            uptime: process.uptime(),
            hrtime: process.hrtime()
          }
        });
        break;
    }
  });
}
