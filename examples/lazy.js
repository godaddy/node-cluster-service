var http = require('http');
var cservice = require("../cluster-service");

cservice.workerReady(false); // inform cservice we're not ready yet

// to emulate a slow startup where-in other
// tasks must be completed prior to server listen
setTimeout(function() {
  http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Hello World\n');
  }).listen(1337, '127.0.0.1', onReady);
}, 2000);

function onReady() {
  console.log('Server running at http://127.0.0.1:1337/');
  cservice.workerReady(); // NOW we're ready
}
