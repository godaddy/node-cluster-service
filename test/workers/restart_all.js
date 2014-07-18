var cservice = require("../../cluster-service");

setTimeout(function() {
  cservice.trigger("restart", "all");
}, 5000);
