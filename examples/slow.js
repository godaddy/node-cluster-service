var http = require('http');
var cservice = require("cluster-service");

cservice.workerReady(false);
var app = http.createServer(function (req, res) {
  setTimeout(function() {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Hello World\n');
  }, 5000);
}).listen(1337, '127.0.0.1'/*, onReady*/);

//function onReady() {
  console.log('Server running at http://127.0.0.1:1337/');
  cservice.workerReady({
    onWorkerStop: function() {
      console.log("Exiting...");
      app.close(function() {
        console.log("stopped listening...");
        process.exit();
      });
    }
  });
//}
