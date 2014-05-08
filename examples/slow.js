var http = require('http');
var app = http.createServer(function (req, res) {
  setTimeout(function() {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Hello World\n');
  }, 2000).unref();
}).listen(1337, '127.0.0.1');
console.log('Server running at http://127.0.0.1:1337/');
