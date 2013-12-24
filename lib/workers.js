var cluster = require("cluster");

exports.get = get;
exports.monitor = monitor;

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

  workers.send=send;

  return workers;
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

/**
 * This is shorthand for:
 * <pre>
 *  module.workers.forEach(function(worker){...});
 * </pre>
 */
function send(){
  this.forEach(function(worker){
    //worker.send.apply(worker, [].slice.apply(arguments));
  });
}
