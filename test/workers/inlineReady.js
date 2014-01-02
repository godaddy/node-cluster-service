var cservice = require("../../cluster-service");

cservice.workerReady(false);

setTimeout(function() {
  cservice.workerReady();
}, 1000);
