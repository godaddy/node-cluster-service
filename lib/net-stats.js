var cservice = require("../cluster-service");

module.exports = exports = netStats;

function netStats(server) {
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
