var path = require("path"),
  cservice = require("../../cluster-service");

module.exports = function(evt, worker, reason) {
	cservice.log(
    ("Worker "
      + path.basename(worker.cservice.worker)
      + "("
      + worker.process.pid
      + ") exited, reason: "
      + (reason || cservice.locals.reason || "Unknown")).warn
  );
};

module.exports.control = function() {
  return "inproc";
};

module.exports.visible = false;
