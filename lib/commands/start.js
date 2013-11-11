var
	async = require("async"),
	util = require("util"),
	cservice = require("../../cluster-service")
;

module.exports = function(evt, cb, workerPath, options) {
	options = options || {};
	options.cwd = options.cwd || process.cwd();
	options.workerCount = parseInt(options.workerCount) || 1;
	options.timeout = parseInt(options.timeout) || 60000;
	if (typeof workerPath !== "string" || options.workerCount < 1) {
		cb("Invalid request. Try help start");
		return;
	}

	evt.locals.reason = "start";
	evt.locals.options.restartOnFailure = false;
	
	var tasks = [];

	cservice.options.log("Starting workers... timeout: " + (options.timeout || 0));

	for (var i = 0; i < options.workerCount; i++) {
		tasks.push(getTask(evt, workerPath, options));
	}
	
	async.series(tasks, function(err) {
		if (err) {
			cb(err);
		} else {
			cb(null, tasks.length + " workers started successfully");
		}
	});
};

module.exports.more = function(cb) {
	cb(null, {
		info: "Gracefully start service, one worker at a time.",
		command: "start workerPath { \"option1\": \"value\" }",
		"workerPath": "Path of worker file (i.e. /workers/worker) to start, absolute path, or relative to cwd.",
		"options": "An object of options.",
		"* cwd": "Path to set as the current working directory. If not provided, existing cwd will be used.",
		"* workerCount": "The number of workers to start, or 1 if not specified.",
		"* timeout": "Timeout, in milliseconds, before terminating replaced workers. 0 for infinite wait.",
		"* workerReady": "If true, will wait for workerReady event before assuming success."
	});
};

function getTask(evt, workerPath, options) {
	return function(cb) {

		// kill new worker if takes too long
		var new_killer = null;

		var exit_listener = function() {
			if (new_killer) {
				clearTimeout(new_killer);
			}
		};

		if (options.timeout > 0) { // start timeout if specified
			new_killer = setTimeout(function() {
				new_worker.removeListener("exit", exit_listener); // remove temp listener
				new_worker.kill("SIGKILL"); // go get'em, killer
				cb("timed out");
			}, options.timeout);
		}

		// lets start new worker
		var new_worker = evt.service.newWorker(workerPath, options.cwd, options, function(err) {
			new_worker.removeListener("exit", exit_listener); // remove temp listener
			if (new_killer) { // timeout no longer needed
				clearTimeout(new_killer);
			}

			cb(err);

		});
	};
}
