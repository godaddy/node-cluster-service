var cservice = require("../cluster-service"),
  cluster = require("cluster"),
  path = require("path"),
  fs = require("fs"),
  util = require("util");

module.exports = exports = newWorker;

function newWorker(options, cb) {
  var worker;
  options = util._extend(util._extend({}, {
    worker: "./worker.js",
    count: undefined,
    restart: true,
    type: 'user',
    version: undefined,
    cwd: undefined,
    onStop: false
  }), options);
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

  var version;
  if (options.version) {
    // track workers with version
    version = cservice.locals.proxy.versions[options.version];
    if (!version) {
      version = {
        name: options.version,
        port: options.PROXY_PORT,
        lastAccess: Date.now(),
        online: false
      };
      cservice.locals.proxy.versions[options.version] = version;
    }
  }

  worker = cluster.fork(options);
  worker.cservice = options;
  worker.on("message", onMessageFromWorker);

  // track every worker by pid
  cservice.locals.workerProcesses[worker.process.pid] = worker;

  return worker;
}

function onMessageFromWorker(msg) {
  var worker = this;
  if (!cservice.msgBus.isValidMessage(msg)) {
    return; // ignore invalid cluster-service messages
  }

  var args, version;

  switch (msg.cservice.cmd) {
    case "workerReady":
      version = cservice.locals.proxy.versions[worker.cservice.version];
      if (version) {
        // if version detected within worker, flag as online
        version.online = true;

        // notify proxy workers of version update
        cservice.proxy.updateProxyWorkers();
      }
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
        if (msg.cservice.cb === true) {
          args.splice(1, 0, function(err, result) {
            // forward response to worker that requested the trigger
            cservice.msgBus.respondToMessage(msg, worker.process, err, result);
          });
        } else {
          args.splice(1, 0, null); // no callback necessary
        }
        cservice.trigger.apply(cservice, args);
      }
      break;
    case "versionUpdateLastAccess":
      version = cservice.locals.proxy.versions[msg.cservice.version];
      if (version) { // update freshness
        version.lastAccess = Date.now();
      }
      break;
  }
}
