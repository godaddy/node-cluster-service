var cservice = require("../../../cluster-service");
var path = require("path");

cservice.workerReady(false);

require("http").createServer(function(req, res) {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end("Hello from " + path.basename(__dirname));
}).listen(process.env.PROXY_PORT || 3000, cservice.workerReady);
