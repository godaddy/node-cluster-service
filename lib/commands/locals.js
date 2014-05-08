var cservice = require("../../cluster-service");

module.exports = function(evt, cb) {
  cb(null, cservice.locals);
};

module.exports.more = function(cb) {
  cb(null, {
    command: "locals",
    info: "Returns locals state object for debug purposes."
  });
};

module.exports.control = function() {
  return "local";
};

module.exports.visible = false;
