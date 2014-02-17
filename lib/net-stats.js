var cservice = require("../cluster-service");

module.exports = exports = netStats;

var monitoring = false;

function netStats(server) {
  if (monitoring === false) {
    monitoring = true;
    monitor(); // init monitor
  }

  server.on("connection", function(connection) {
    cservice.locals.stats.net.connections++;
    cservice.locals.stats.net.connectionsOpen++;
    connection.on("close", function() {
      cservice.locals.stats.net.connectionsOpen--;
    });
  });

  server.on("request", function() {
    cservice.locals.stats.net.requests++;
  });
}

// Why in its own monitor? Worker may reference different version of cservice
// than the master, which is where these stats are tracked (to avoid blasting
// messages when the data is not needed).
// TODO: Move worker stats to its own class so this technique can be leveraged
//       for any type of stats in the future.
function monitor() {
  process.on("message", function(msg) {
    if (!msg || typeof msg.cservice !== "string") {
      return; // ignore
    }

    switch (msg.cservice) {
      case "netStats":
        process.send({
          cservice: "netStats",
          netStats: cservice.locals.stats.net
        });
        break;
    }
  });
}
