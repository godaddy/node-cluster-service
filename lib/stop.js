var cservice = require("../cluster-service");

module.exports = exports = stop;

function stop(timeout, cb) {
  if (cservice.locals.state === 0) {
    if(cb){
      cb();
    }
    return;
  }

  if (cservice.workers.length > 0) { // issue shutdown
    cservice.trigger("shutdown", function() {
      require("./http-server").close();
      if (cservice.options.cli === true) {
        process.exit(1);
      } else {
        if(cb){
          cb();
        }
      }
    }, "all", timeout);
  } else { // gracefully shutdown
    require("./http-server").close();
    cservice.locals.state = 0;
    if (cservice.options.cli === true) {
      process.exit(1);
    } else {
      if(cb){
        cb();
      }
    }
  }
}
