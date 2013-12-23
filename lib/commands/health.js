var cluster = require("cluster");

module.exports = function(evt, cb) {
  cb(null, "OK");
};

module.exports.more = function(cb) {
  cb(null, {
    command: "health",
    info: [
      "Returns health of service.",
      "May be overidden by service to expose app-specific data."
    ].join(' ')
  });
};
