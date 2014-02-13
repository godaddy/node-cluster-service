var cservice = require("../cluster-service");

module.exports = exports = netStats;

function netStats(server) {
  server.on("connection", handleConnectionOpen);
  server.on("request", handleRequest);
}

function handleConnectionOpen(connection){
  cservice.locals.stats.net.connections++;
  cservice.locals.stats.net.connectionsOpen++;
  connection.on("close", handleConnectionClose);
}

function handleConnectionClose(){
  cservice.locals.stats.net.connectionsOpen--;
}

function handleRequest(){
  cservice.locals.stats.net.requests++;
}
