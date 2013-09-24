var
	readline = require("readline"),
	util = require("util"),
	rl = readline.createInterface({ input: process.stdin, output: process.stdout }),
	request = require("request"),
	querystring = require("querystring"),
	locals = null,
	options = null,
	cservice = require("../cluster-service")
;

exports.init = function(l, o) {
	locals = l;
	options = o;

	cservice.options.log("Service already running. Attaching CLI to master service");

	if (!options || options.silentMode !== true) {
		rl.question("Command? (or help)\r\n", onCommand);
	}
};

exports.execute = onCommand;

function onCommand(question, cb) {
	var split = question.split(" ");
	if (split[0] === "exit") {
		cservice.options.log("Exiting CLI ONLY.");
		process.kill(process.pid, "SIGKILL"); // exit by force
		return;
	}
	var qs = querystring.stringify({
		cmd: question,
		accessKey: options.accessKey
	});
	var url = "http://" + (options.host || "localhost") + ":" + (options.port || 11987) + "/cli"
		+ "?" + qs
	;
	cservice.options.log("Running remote command: " + url);
	request.post(url, function (err, res, body) {
		if (err) {
			onCallback(err, null, cb);
		} else {
			onCallback(null, body, cb);
		}
	});
}

function onCallback(err, result, cb) {
	if (err) {
		cservice.options.log("Error: ", err);
	} else if (result) {
		if (typeof result === "string" && (result.indexOf("{") === 0 || result.indexOf("[") === 0)) {
			result = JSON.parse(result); // deserialize
		}
		cservice.options.log(util.inspect(result, { depth: null }));
	}

	cservice.options.log("");//newline
	
	if (!options || options.silentMode !== true) {
		rl.question("Command? (or help)\r\n", onCommand);
	}
	
	cb && cb(err, result);
}
