var path = require("path"),
  cservice = require("../../cluster-service");

module.exports = function(evt, cb, worker, reason) {
	cservice.log(
    ("Worker "
      + path.basename(worker.cservice.worker)
      + "("
      + worker.process.pid
      + ") exited, reason: "
      + (reason || worker.cservice.reason ||
        cservice.locals.reason || "Unknown")).warn
  );
  cb();
};

module.exports.control = function() {
  return "inproc";
};

module.exports.visible = false;
