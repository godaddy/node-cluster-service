var
	cservice = require("../cluster-service"),
	cluster = require("cluster"),
	fs = require("fs"),
	path = require("path"),
	colors = require("colors"),
	extend = require("extend")
;

module.exports = exports = start;

start.prepArgs = prepArgs;

function start(options, masterCb) {
	if (cluster.isWorker === true) {
		// ignore starts if not master. do NOT invoke masterCb, as that is reserved for master callback
		
		return;
	}

	if (arguments.length === 0) {
		var argv = require("optimist").argv;

		options = argv; // use command-line arguments instead
		prepArgs(options);
		
		masterCb = masterCallback;
	}
	
	options = options || {};
	if ("config" in options) {
		options = JSON.parse(fs.readFileSync(options.config));
	}
	cservice.locals.options = extend(true, cservice.locals.options, options);
	if ("workers" in options) { // overwrite workers if provided
		cservice.locals.options.workers = options.workers;
	}
	options = cservice.locals.options;
	if (typeof options.workers === "undefined") {
		// only define default worker if worker is undefined (null is reserved for "no worker")
		options.workers = "./worker.js"; // default worker to execute
	}
	if (typeof options.workers === "string") {
		options.workers = { main: { worker: options.workers, ready: (options.ready === true) } };
		delete options.ready;
	}
	
	colors.setTheme(options.colors);

	require("./legacy");
	
	if (options.run) {
		require("./run").start(options, function(err, result) {
			if (masterCb && masterCb(err, result) === false) {
				return; // do not exit if cb returns false
			}
			process.exit(1); // graceful exit
		});
	} else {	
		require("./master").start(options, masterCb);
	}
}

function masterCallback(err) {
	if (err) {
		cservice.error(err);
		cservice.log("Startup failed, exiting...".warn);
		process.exit(1); // graceful exit
	}
}

function prepArgs(options) {
	if (options._ && options._.length > 0) {
		var ext = path.extname(options._[0]).toLowerCase();
		if (ext === ".js") { // if js file, use as worker
			options.workers = options._[0]
		} else if (ext === ".json") { // if json file, use as config
			options.config = options._[0];
		} else { // otherwise assume it is a command to execute
			options.run = options._[0];
			if (options.json === true) {
				options.cli = false;
			}
		}
	}
}