var cservice = require("../cluster-service");
var util = require("util");
var net = require("net");
var netStats = require("./net-stats");
var async = require("async");

var netServers = {
  add: netServersAdd,
  remove: netServersRemove,
  waitForReady: netServersWaitForReady,
  close: netServersClose
};

module.exports = exports = netServers;

wireupNetServerProto(); // init

function netServersAdd(servers) {
  if (util.isArray(servers) === false) {
    servers = [servers];
  }
  
  for (var i = 0; i < servers.length; i++) {
    var server = servers[i];
    if (server.cservice)
      continue; // ignore if already added
    
    server.cservice = {
      id: Math.random().toString(), // track by id
      isReady: true // assume true unless known to be otherwise
    };
    cservice.locals.net.servers[server.cservice.id] = server;
    
    listenToNetServer(server);
    netStats(server);
  }
}

function netServersRemove(servers) {
  if (util.isArray(servers) === false) {
    servers = [servers];
  }

  for (var i = 0; i < servers.length; i++) {
    var server = servers[i];
    if (!server.cservice)
      continue; // ignore if not tracked by cservice
    // stop tracking
    delete cservice.locals.net.servers[server.cservice.id];
    // unreference from cservice
    delete server.cservice;
    
    stopListeningToNetServer(server);
  }
}

function netServersWaitForReady(cb) {
  var tasks = [];
  
  for (var id in cservice.locals.net.servers) {
    var server = cservice.locals.net.servers[id];
    if (!server.cservice || server.cservice.isReady === true)
      continue;
      
    tasks.push(createWaitForReadyTask(server));
  }
  
  if (tasks.length === 0) {
    return cb();
  }
  
  async.parallel(tasks, cb);
}

function createWaitForReadyTask(server) {
  return function(cb) {
    var ticks = 0;
    var timer = setInterval(function() {
      if (!server.cservice // unregistered
        || server.cservice.isReady === true // now ready
        || ticks++ > 1000 // timeout (~10sec)
      ) {
        clearInterval(timer);
        cb(null, true);
      }
    }, 10); // aggressive polling loop since it is uncommon task but a priority
    timer.unref();
  };
}

function netServersClose(cb) {
  var tasks = [];

  for (var id in cservice.locals.net.servers) {
    var server = cservice.locals.net.servers[id];
    if (!server.cservice || server.cservice.isReady === false)
      continue;

    tasks.push(createWaitForCloseTask(server));
  }
  
  if (tasks.length === 0) {
    return cb();
  }

  async.parallel(tasks, cb);
}

function createWaitForCloseTask(server) {
  return function(cb) {
    server.once("close", function() { cb(null, true); });
    server.close();
  };
}

var serverListenOld;

function wireupNetServerProto() {
  serverListenOld = net.Server.prototype.listen;
  
  net.Server.prototype.listen = serverListenNew;
}

function listenToNetServer(server) {
  server.on("close", serverOnClose);
}

function stopListeningToNetServer(server) {
  server.removeListener("listening", serverOnListening);
  server.removeListener("close", serverOnClose);
}

function serverListenNew() {
  netServersAdd(this); // track net server

  this.cservice.isReady = false; // not ready
  this.on("listening", serverOnListening); // ready on event
  
  return serverListenOld.apply(this, arguments); // call original listen
}

function serverOnListening() {
  if (!this.cservice)
    return; // ignore

  this.cservice.isReady = true;
}

function serverOnClose() {
  if (!this.cservice)
    return; // ignore

  this.cservice.isReady = false;

  // stop monitoring closed connections
  netServersRemove(this);
}
