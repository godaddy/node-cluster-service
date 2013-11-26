var
	cservice = require("../cluster-service"),
	util = require("util"),
	locals = null,
	options = null
;

exports.init = function(l, o) {
	locals = l;
	options = o;

	util.inspect.styles.name = "grey";

	cservice.log("CLI is now available. Enter 'help [enter]' for instructions.".info);
	process.stdin.resume();
	process.stdin.setEncoding('utf8');
	
	process.stdin.on("data", onCommand);

	// wait momentarily before attaching CLI. allows workers a little time to output as needed
	setTimeout(function() {
	    process.stdout.write("cservice> ".cservice);
	}, 1000);
};

exports.close = function() {
	try {
		process.stdin.pause();
	} catch (ex) {
	}
};

function onCommand(question) {
    question = question.replace(/[\r\n]/g, "");
	var args = require("./util").getArgsFromQuestion(question, " ");
	args = [args[0], onCallback].concat(args.slice(1));
	
	if (!locals.events[args[0]]) {
		onCallback("Command " + args[0] + " not found. Try 'help'.");

		return;
	}
	
	try {
		cservice.trigger.apply(null, args);
	} catch(ex) {
		cservice.error("Command Error " + args[0], util.inspect(ex, { depth:null } ), ex.stack || new Error().stack);

		onCallback();
	}
}

function onCallback(err, result) {
	delete locals.reason;
	
	if (err) {
		cservice.error("Error: ", err, err.stack ? util.inspect(err.stack, { depth:null, colors: true}) : "");
	} else if (result) {
		cservice.log(util.inspect(result, { depth: null, colors: true }));
	}

	//cservice.log("");//newline
	
	process.stdout.write("cservice> ".cservice);
}
