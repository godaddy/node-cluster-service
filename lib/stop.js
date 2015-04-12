var cservice = require("../cluster-service");

module.exports = exports = stop;

function stop(timeout, cb) {
  if (cservice.locals.state === 0) {
    if (cb) cb(null, "Not running");
    return;
  }

  if (cservice.workers.length > 0) { // issue shutdown
    cservice.trigger("shutdown", function() {
      if (cb) cb(null, "Shutting down...");
      require("./http-server").close();
      if (cservice.options.cli === true) {
        process.exit(0);
      }
    }, "all", timeout);
  } else { // gracefully shutdown
    if (cb) cb(null, "Shutting down...");
    require("./http-server").close();
    cservice.locals.state = 0;
    if (cservice.options.cli === true) {
      process.exit(0);
    }
  }
}
