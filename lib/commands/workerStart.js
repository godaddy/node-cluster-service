var path = require("path"),
  cservice = require("../../cluster-service");

module.exports = function(evt, worker, reason) {
	cservice.log(
    ("Worker "
      + path.basename(worker.cservice.worker)
      + "("
      + worker.process.pid
      + ") start, reason: "
      + (reason || cservice.locals.reason || "Unknown")).success
  );
};

module.exports.control = function() {
  return "inproc";
};

module.exports.visible = false;
