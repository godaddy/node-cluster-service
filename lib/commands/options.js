var cservice = require("../../cluster-service");

module.exports = function(evt, cb) {
  cb(null, cservice.locals);
};

module.exports.more = function(cb) {
  cb(null, {
    command: "options",
    info: "Returns current options for debug purposes."
  });
};

module.exports.control = function() {
  return "local";
};

module.exports.visible = false;
