var cservice = require("../cluster-service"),
  util = require("util"),
  http = require("http"),
  https = require("https"),
  querystring = require("querystring"),
  control = require("./control"),
  options = null,
  server = null;

exports.init = function(o, cb) {
  options = o;

  if (options.ssl) { // HTTPS
    server = cservice.locals.http =
      https.createServer(options.ssl, processRequest)
    ;
  } else { // HTTP
    server = cservice.locals.http =
      http.createServer(processRequest)
    ;
  }

  server.on("error", cb);
  server.listen(options.port, options.host, cb);
};

exports.close = function() {
  try {
    server.close();
  } catch (ex) {
  }
};

function processRequest(req, res) {
  var qsIdx, qs, question;
  try {
    cservice.log(
      "API: "
      + req.url.replace(/accessKey=.*/i, "accessKey={ACCESS_KEY}").data
    );

    if (req.url.indexOf("/cli?") !== 0) {
      res.writeHead(404);
      res.end("Page Not Found");
      return;
    }

    if (req.method !== "POST" && cservice.options.allowHttpGet !== true) {
      res.writeHead(405);
      res.end("Method Not Allowed");
      return;
    }

    qsIdx = req.url.indexOf("?");

    qs = querystring.parse(req.url.substr(qsIdx + 1));
    if (!qs.accessKey || qs.accessKey !== options.accessKey) {
      res.writeHead(401);
      res.end("Not authorized");
      return;
    }

    question = qs.cmd || "";

    req.on('data', function (chunk) {
      question += chunk;
    });

    req.on('end', function () {
      onCommand(req, res, question, qs.accessKey);
    });
  } catch (ex) {
    cservice.error(
      "Woops, an ERROR!".error,
      util.inspect(ex, {depth: null}),
      util.inspect(ex.stack || new Error().stack, {depth: null})
    );
  }
}

function onCommand(req, res, question, accessKey) {
  var args = require("./util").getArgsFromQuestion(question, " ");
  var controlLevel;
  var isAuthorized;

  args = [args[0], function(err, result) {
      onCallback(req, res, err, result);
    }].concat(args.slice(1));

  if (!cservice.locals.events[args[0]]) {
    cservice.error("Command " + (args[0] + "").cyan + " not found".error);
    res.writeHead(404);
    res.end("Not found. Try /help");
    return;
  }

  controlLevel = control.levels.remote;
  if (req.connection.remoteAddress === "127.0.0.1") {
    controlLevel = control.levels.local;
  }

  isAuthorized = control.authorize(args[0], controlLevel, accessKey);

  if (!isAuthorized) {
    res.writeHead(401);
    res.end("Not authorized to execute '" + args[0] + "' remotely");
    return;
  }

  try {
    cservice.trigger.apply(null, args);
  } catch (ex) {
    res.writeHead(400);
    res.end(JSON.stringify(
      {
        ex: ex,
        stack: ex.stack || new Error().stack,
        more: "Error. Try /help"
      }
    ));
  }
}

function onCallback(req, res, err, result) {
  var body;
  try {
    delete cservice.locals.reason;

    if (err) { // should do nothing if response already sent
      res.writeHead(400);
      res.end(err);
    } else {
      if (result) {
        try
        {
          body = JSON.stringify(result, function(key, val) {
            if (key[0] === "_") {
              return undefined;
            } else {
              return val;
            }
          });
          res.writeHead(
            200,
            {
              "Content-Type": "text/json; charset=UTF-8",
              "Content-Length": Buffer.byteLength(body)
            }
          );
          res.end(body);
        } catch (ex) {
          err = util.inspect(ex, {depth: null});
          res.writeHead(400);
          res.end(JSON.stringify({error: err}));
          cservice.error(
            "Woops, an ERROR!".error,
            err,
            util.inspect(ex.stack || new Error().stack, {depth: null})
          );
        }
      } else {
        res.writeHead(200);
        res.end("No data");
      }
    }
  } catch (ex) {
    cservice.error(
      "Woops, an ERROR!".error,
      util.inspect(ex, {depth: null}),
      util.inspect(ex.stack || new Error().stack, {depth: null})
    );
  }
}
