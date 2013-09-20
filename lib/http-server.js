var
	cservice = require("../cluster-service"),
	util = require("util"),
	http = require("http"),
	querystring = require("querystring"),
	control = require("./control"),
	locals = {},
	options = null,
	server = null
;

exports.init = function(l, o, cb) {
	locals = l;
	options = o;

	server = locals.http = http.createServer(processRequest);
	
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
	try {
		console.log("cluster-service::REST: " + req.url);

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

		var qs_idx = req.url.indexOf("?");
		
		var qs = querystring.parse(req.url.substr(qs_idx + 1));
		if (!qs.accessKey || qs.accessKey !== options.accessKey) {
			res.writeHead(401);
			res.end("Not authorized");
			return;
		}
		var question = qs.cmd || "?";

		onCommand(req, res, question);
	} catch (ex) {
		console.log("cluster-service: Woops, an ERROR!", util.inspect(ex, {depth:null}), util.inspect(ex.stack || new Error().stack, {depth:null}));
	}
}

function onCommand(req, res, question) {
	var args = require("./util").getArgsFromQuestion(question, " ");
	args = [args[0], function(err, result) { onCallback(req, res, err, result); }].concat(args.slice(1));

	if (!locals.events[args[0]]) {
		console.log("Command " + args[0] + " not found");
		res.writeHead(404);
		res.end("Not found. Try /help");
		return;
	}

	var controlLevel = control.levels.remote;
	if (req.connection.remoteAddress === "127.0.0.1"){
		controlLevel = control.levels.local;
	}

	var isAuthorized = control.authorize(args[0], controlLevel);

	if (!isAuthorized){
		res.writeHead(401);
		res.end("Not authorized to execute '" + args[0] + "' remotely");
		return;
	}

	try {
		cservice.trigger.apply(null, args);
	} catch(ex) {
		res.writeHead(400);
		res.end(util.inspect({ex: util.inspect(ex, { depth:null } ), stack: ex.stack || new Error().stack, more: "Error. Try /help"}));
	}	
}

function onCallback(req, res, err, result) {
	try {
		delete locals.reason;
		
		if (err) { // should do nothing if response already sent
			res.writeHead(400);
			res.end(err);
		} else {
			if (result) {
				var body = util.inspect(result, { depth: null });
				//var body = JSON.stringify(result);
				res.writeHead(200, { "Content-Type": "text/json; charset=UTF-8", "Content-Length": body.length });
				res.end(body);
			} else {
				res.writeHead(200);
				res.end("No data");
			}
		}
	} catch (ex) {
		console.log("cluster-service: Woops, an ERROR!", util.inspect(ex, {depth:null}), util.inspect(ex.stack || new Error().stack, {depth:null}));
	}
}
