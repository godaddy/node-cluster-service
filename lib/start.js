var
	async = require("async"),
	util = require("util"),
	cservice = require("../cluster-service")
;

module.exports = function(evt, cb, workerPath, cwd, workerCount, timeout) {
	cwd = cwd || process.cwd();
	workerCount = parseInt(workerCount) || 1;
	timeout = parseInt(timeout) || 60000;
	if (typeof workerPath !== "string" || workerCount < 1) {
		cb("Invalid request. Try help start");
		return;
	}

	evt.locals.reason = "start";
	evt.locals.options.restartOnFailure = false;
	
	var tasks = [];

	cservice.options.log("Starting workers... timeout: " + (timeout || 0));

	for (var i = 0; i < workerCount; i++) {
		tasks.push(getTask(evt, workerPath, cwd, timeout));
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
		command: "start workerPath [cwd] [timeout]",
		"workerPath": "Path of worker file (i.e. /workers/worker) to start, absolute path, or relative to cwd.",
		"cwd": "Path to set as the current working directory. If not provided, existing cwd will be used.",
		"workerCount": "The number of workers to start, or 1 if not specified.",
		"timeout": "Timeout, in milliseconds, before terminating replaced workers. 0 for infinite wait."
	});
};

function getTask(evt, workerPath, cwd, timeout) {
	return function(cb) {

		// kill new worker if takes too long
		var new_killer = null;

		var exit_listener = function() {
			if (new_killer) {
				clearTimeout(new_killer);
			}
		};

		if (timeout > 0) { // start timeout if specified
			new_killer = setTimeout(function() {
				new_worker.removeListener("exit", exit_listener); // remove temp listener
				new_worker.kill("SIGKILL"); // go get'em, killer
				cb("timed out");
			}, timeout);
		}

		// lets start new worker
		var new_worker = evt.service.newWorker(workerPath, cwd, {}, function(err) {
			new_worker.removeListener("exit", exit_listener); // remove temp listener
			if (new_killer) { // timeout no longer needed
				clearTimeout(new_killer);
			}

			cb(err);

		});
	};
}
