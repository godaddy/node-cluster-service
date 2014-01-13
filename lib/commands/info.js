var cservice = require("../../cluster-service");

module.exports = function(evt, cb, cmd) {
  cservice.trigger("workers", function(err, results) {
    if (err) {
      cb(err);
      return;
    }

    var workers = results.workers;
    var summary = {
      workers: { active: workers.length },
      memory: { rss: 0, heapTotal: 0, heapUsed: 0 },
      net: { connections: 0, connectionsOpen: 0, requests: 0 }
    };
    
    for (var i = 0; i < workers.length; i++) {
      var w = workers[i];
      var p = w.process;
      summary.memory.rss += p.memory.rss;
      summary.memory.heapTotal += p.memory.heapTotal;
      summary.memory.heapUsed += p.memory.heapUsed;
      summary.net.connections += p.net.connections;
      summary.net.connectionsOpen += p.net.connectionsOpen;
      summary.net.requests += p.net.requests;
    }
    
    cb(null, summary);
  }, "simple");
};

module.exports.more = function(cb) {
  cb(null, {
    command: "info",
    info: "Returns summary of process & workers."
  });
};

module.exports.control = function() {
  return "remote"; // consistent with "workers" command,
                   // but may be locked down in the future
};
