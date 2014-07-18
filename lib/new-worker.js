var cservice = require("../cluster-service"),
  cluster = require("cluster"),
  path = require("path"),
  fs = require("fs"),
  extend = require("extend");

module.exports = exports = newWorker;

function newWorker(options, cb) {
  var worker;
  options = extend(true, {}, {
    worker: "./worker.js",
    count: undefined,
    restart: true,
    cwd: undefined,
    onStop: false
  }, options);
  options.ready = false;
  if (
    options.worker.indexOf(".") === 0
    || (options.worker.indexOf("//") !== 0
    && options.worker.indexOf(":\\") < 0)
  ) {
    // resolve if not absolute
    options.worker = path.resolve(options.worker);
  }
  if (
    fs.existsSync(options.worker) === false
    && fs.existsSync(options.worker + ".js") === false
  ) {
    if(cb){
      cb(
        "Worker not found: '"
        + options.worker
        + "'. Set 'workers' option to proper path."
      );
    }
    return null;
  }
  options.cwd = options.cwd || process.cwd();
  options.onReady = cb;
  worker = cluster.fork(options);
  worker.cservice = options;
  worker.on("message", onMessageFromWorker);

  return worker;
}

function onMessageFromWorker(msg) {
  var worker = this;
  if (!msg || !msg.cservice || !msg.cservice.cmd) {
    return; // ignore invalid cluster-service messages
  }

  var args;

  switch (msg.cservice.cmd) {
    case "workerReady":
      if (worker.cservice.ready === false) {
        // preserve preference between restarts, etc
        worker.cservice.ready = true;
        worker.cservice.onStop = (msg.cservice.onStop === true);
        if(typeof worker.cservice.onReady === "function"){
          worker.cservice.onReady(null, worker);
        }
      }
      break;
    case "trigger":
      args = msg.cservice.args;
      if (args && args.length > 0) {
        cservice.trigger.apply(cservice, args);
      }
      break;
  }
}
