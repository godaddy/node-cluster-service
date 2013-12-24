var cservice = require("../cluster-service");

module.exports = exports = legacySupport;

function legacySupport(options) {
  if (options.worker) {
    cservice.log(
      "Option `worker` has been deprecated. Use `workers` instead.".warn
    );
    options.workers = options.worker;
    delete options.worker;
  }
}

legacySupport(cservice.options);
