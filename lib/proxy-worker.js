var cservice = require("../cluster-service");
var cluster = require("cluster");
var fs = require("fs");
var path = require("path");
var httpProxy = require('http-proxy');
var msgBus = require('./message-bus');

cservice.workerReady(false);

var proxy = httpProxy.createProxyServer({});
var versionHeader = cluster.worker.env.versionHeader;
var versionPath = cluster.worker.env.versionPath;
var bindingInfo = JSON.parse(cluster.worker.env.bindingInfo);
var workerFilename = cluster.worker.env.workerFilename;
var waiters = {};
cservice.locals.proxy.defaultVersion = null; // default not set til online

// set initial versions based on state provided by master
cservice.locals.proxy.versions = JSON.parse(cluster.worker.env.versions);

var proxyServer;

if (bindingInfo.tlsOptions) {
  // https

  if (typeof bindingInfo.tlsOptions.key === "string") {
    bindingInfo.tlsOptions.key = fs.readFileSync(bindingInfo.tlsOptions.key);
  }
  if (typeof bindingInfo.tlsOptions.cert === "string") {
    bindingInfo.tlsOptions.cert = fs.readFileSync(bindingInfo.tlsOptions.cert);
  }
  if (typeof bindingInfo.tlsOptions.pem === "string") {
    bindingInfo.tlsOptions.pem = fs.readFileSync(bindingInfo.tlsOptions.pem);
  }

  proxyServer = require("https").createServer(
    bindingInfo.tlsOptions, proxyServerRequest
  );
} else {
  // http

  proxyServer = require("http").createServer(proxyServerRequest);
}

process.on("message", onMessageFromMaster);

function proxyServerRequest(req, res) {
  var versionStr = req.headers[versionHeader] ||
    cservice.locals.proxy.options.defaultVersion
  ;

  getProxyVersion(versionStr, function (err, version) {
    if (err) {
      cservice.log("Failed to load proxy version " + versionStr, err);

      // todo: add option to set 404 content
      // via options.customResponses[404] file
      res.writeHead(404);
      return void res.end("Not found");
    }
    proxy.web(req, res, { target: "http://127.0.0.1:" + version.port });
  });
}

proxyServer.listen(bindingInfo.port, cservice.workerReady);

function getProxyVersion(versionStr, cb) {
  var version = cservice.locals.proxy.versions[versionStr];
  if (version) {
    updateVersionLastAccess(version);
    return waitForVersionToComeOnline(versionStr, cb);
  }

  // version not found, lets start it
  cservice.trigger("proxy", function(err, result) {
    if (err) {
      return cb(err);
    }

    // return newly started version
    waitForVersionToComeOnline(versionStr, cb);
  }, "version", versionStr);
}

function waitForVersionToComeOnline(versionStr, cb) {
  var version = cservice.locals.proxy.versions[versionStr];
  if (version && version.online === true) {
    return cb(null, version); // ready!
  }

  // try waiting
  var timer, attempts = 0;
  timer = setInterval(function() {
    version = cservice.locals.proxy.versions[versionStr];
    if (version && version.online === true) {
      clearInterval(timer);
      return cb(null, version);
    }
    attempts++;
    if (attempts > 240) {
      clearInterval(timer);
      return cb("Timed out waiting for version to come online!");
    }
  }, 250);
  timer.unref();
}

function onMessageFromMaster(msg) {
  if (!msgBus.isValidMessage(msg)) return;

  switch (msg.cservice.cmd) {
    case "proxyVersions":
      // update versions state
      cservice.locals.proxy.versions = msg.cservice.versions;
      cservice.locals.proxy.options.defaultVersion =
        msg.cservice.defaultVersion
      ;

      // update version for default port mapping
      cservice.locals.proxy.defaultVersion =
        cservice.locals.proxy.versions[msg.cservice.defaultVersion]
      ;

      break;
  }
}

function updateVersionLastAccess(version) {
  var now = Date.now();
  var diff = now - version.lastAccess;
  if (diff >= 0 && diff < 5000) {
    return; // if less than 5 seconds since last access,
            // don't bother updating master
  }
  version.lastAccess = now;
  var msg = cservice.msgBus.createMessage("versionUpdateLastAccess", {
    version: version.name
  });
  cservice.processSafeSend(process, msg);
}
