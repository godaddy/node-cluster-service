var
	readline = require("readline"),
	util = require("util"),
	rl = readline.createInterface({ input: process.stdin, output: process.stdout }),
	request = require("request"),
	querystring = require("querystring"),
	locals = null,
	options = null
;

exports.init = function(l, o) {
	locals = l;
	options = o;

	console.log("Service already running. Attaching CLI to master service");
	console.dir(o);
	rl.question("Command? (or help)\r\n", onCommand);
};

function onCommand(question) {
	var split = question.split(" ");
	if (split[0] === "exit") {
		console.log("Exiting CLI ONLY.");
		process.kill(process.pid, "SIGKILL"); // exit by force
		return;
	}
	var qs = querystring.stringify({
		cmd: question,
		accessKey: options.accessKey
	});
	var url = "http://" + options.host + ":" + options.port + "/cli"
		+ "?" + qs
	;
	console.log("Running remote command: " + url);
	request.post(url, function (err, res, body) {
		if (err) {
			onCallback(err);
		} else {
			onCallback(null, body);
		}
	});
}

function onCallback(err, result) {
	if (err) {
		console.log("Error: ", err);
	} else if (result) {
		if (typeof result === "string" && (result.indexOf("{") === 0 || result.indexOf("[") === 0)) {
			result = JSON.parse(result); // deserialize
		}
		console.log(util.inspect(result, { depth: null }));
	}

	console.log("");//newline
	
	rl.question("Command? (or help)\r\n", onCommand);
}
