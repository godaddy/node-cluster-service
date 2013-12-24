var cservice = require("../cluster-service"),
    path = require("path"),
    cluster = require("cluster");

module.exports = exports = on;

function on(eventName, cb, overwriteExisting) {
  var evt;
  var controls;
  if (cluster.isMaster === false) {
    // no action to take on workers -- convenience feature as to not 
    // pollute master code
    return;
  }

  overwriteExisting = overwriteExisting || true;
  if (!overwriteExisting && eventName in cservice.locals.events) {
    return; // do not overwrite existing
  }

  evt = {
    name: eventName,
    service: cservice,
    locals: cservice.locals,
    cb: cb
  };

  // Adding control for this eventName
  if (typeof cb.control === "function") {
    controls = {};
    controls[eventName] = cb.control();
    require("./control").addControls(controls);
  }

  // overwrite existing, if any
  cservice.locals.events[eventName] = evt;
}

if (cluster.isMaster === true && cservice.locals.firstTime === true) {
	cservice.locals.firstTime = false;

	// only register listeners if master
	on("start", require("./commands/start"), false);
	on("restart", require("./commands/restart"), false);
	on("shutdown", require("./commands/shutdown"), false);
	on("exit", require("./commands/exit"), false);
	on("help", require("./commands/help"), false);
	on("upgrade", require("./commands/upgrade"), false);
	on("workers", require("./commands/workers"), false);
	on("health", require("./commands/health"), false);
	on("version", require("./commands/version"), false);
	on("v", require("./commands/version"), false);
	on("workerStart", function(evt, worker, reason) {
		cservice.log(
      ("Worker "
        + path.basename(worker.cservice.worker)
        + "("
        + worker.process.pid
        + ") start, reason: "
        + (reason || cservice.locals.reason || "Unknown")).success
    );
	}, false);
	on("workerExit", function(evt, worker, reason) {
		cservice.log(
      ("Worker "
        + path.basename(worker.cservice.worker)
        + "("
        + worker.process.pid
        + ") exited, reason: "
        + (reason || cservice.locals.reason || "Unknown")).warn
    );
	}, false);
}