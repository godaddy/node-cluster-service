var cservice = require("../cluster-service");

module.exports = exports = netStats;

var monitoring = false, statTimer;
var net = {
  requests: 0,
  connections: 0,
  connectionsOpen: 0,
  avgRequests: 0,
  avgConnections: 0
};
var stats = {
  lastCheck: new Date().getTime(),
  connections: 0,
  requests: 0
};

function netStats(server) {
  if (monitoring === false) {
    monitoring = true;
    monitor(); // init monitor
  }

  server.on("connection", function(connection) {
    net.connections++;
    net.connectionsOpen++;
    connection.on("close", function() {
      net.connectionsOpen--;
    });
  });

  server.on("request", function() {
    net.requests++;
  });
}

var STAT_FREQUENCY = 1000;
var STAT_FACTOR = 3;

// Why in its own monitor? Worker may reference different version of cservice
// than the master, which is where these stats are tracked (to avoid blasting
// messages when the data is not needed).
// TODO: Move worker stats to its own class so this technique can be leveraged
//       for any type of stats in the future.
function monitor() {
  statTimer = setInterval(statTracker, STAT_FREQUENCY);
  statTimer.unref();

  process.on("message", function(msg) {
    if (!cservice.msgBus.isValidMessage(msg)) {
      return; // ignore
    }

    switch (msg.cservice.cmd) {
      case "netStats":
        cservice.processSafeSend(process,
          cservice.msgBus.createMessage("netStats", {
            netStats: net
        }));
        break;
    }
  });
}

function statTracker() {
  var now = new Date().getTime();
  var timeDiff = now - stats.lastCheck;
  var reqDiff = net.requests - stats.requests;
  var conDiff = net.connections - stats.connections;
  var reqPsec = (reqDiff / timeDiff) * 1000;
  var conPsec = (conDiff / timeDiff) * 1000;

  net.avgRequests = (reqPsec + (net.avgRequests * (STAT_FACTOR - 1)))
    / STAT_FACTOR
  ;
  net.avgConnections = (conPsec + (net.avgConnections * (STAT_FACTOR - 1)))
    / STAT_FACTOR
  ;

  // reset
  stats.lastCheck = now;
  stats.requests = net.requests;
  stats.connections = net.connections;
}
