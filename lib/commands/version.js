var cservice = require("../../cluster-service");

module.exports = function(evt, cb) {
  var pkg = require("../../package.json");
  cb(null, pkg.version);
};

module.exports.more = function(cb) {
  cb(null, {
    info: "Get version of cluster-service.",
    command: "version"
  });
};
