var http = require('http');
http.createServer(function (req, res) {
  setTimeout(function() {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Hello World');
  }, 500).unref(); // do not hold process open by timer handle
}).listen(9817, '127.0.0.1');
