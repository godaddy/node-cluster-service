var cservice = require("../../cluster-service");

setTimeout(function() {
  cservice.workerReady();
}, 100);
