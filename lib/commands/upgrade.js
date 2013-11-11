var
	async = require("async"),
	util = require("util"),
	cservice = require("../../cluster-service")
;

module.exports = function(evt, cb, cmd, workerPath, options) {
	var pid = parseInt(cmd);
	options = options || {};
	options.cwd = options.cwd || process.cwd();
	options.timeout = parseInt(options.timeout) || 60000;
	if (typeof cmd !== "string" || typeof workerPath !== "string" || (cmd !== "all" && !pid)) {
		cb("Invalid request. Try help upgrade");
		return;
	}

	evt.locals.reason = "upgrade";
	var originalAutoRestart = evt.locals.options.restartOnFailure;
	evt.locals.options.restartOnFailure = false;
	
	var workers = evt.service.workers;
	var tasks = [];

	for (var w in workers) {
		var worker = workers[w];
		if (pid && worker.process.pid !== pid) {
			continue; // cannot kill external processes
		}

		tasks.push(getTask(evt, worker, workerPath, options));
	}
	
	if (tasks.length === 0) {
		cb("No workers to upgrade");
	} else {
		cservice.options.log("Upgrading workers... timeout: " + (options.timeout || 0));

		async.series(tasks, function(err) {
			evt.locals.options.restartOnFailure = originalAutoRestart;

			if (err) {
				cb(err);
			} else {
				cb(null, tasks.length + " workers upgraded successfully");
			}
		});
	}
};

module.exports.more = function(cb) {
	cb(null, {
		info: "Gracefully upgrade service, one worker at a time.",
		command: "upgrade all|pid workerPath { \"option1\": \"value\" }",
		"all|pid": "Required. 'all' to force shutdown of all workers, otherwise the pid of the specific worker to upgrade",
		"workerPath": "Path of worker file (i.e. /workers/worker) to start, absolute path, or relative to cwd.",
		"options": "An object of options.",
		"* cwd": "Path to set as the current working directory. If not provided, existing cwd will be used.",
		"* timeout": "Timeout, in milliseconds, before terminating replaced workers. 0 for infinite wait."
	});
};

function getTask(evt, worker, workerPath, options) {
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
		var new_worker = evt.service.newWorker(workerPath, options.cwd, worker.cservice.options, function(err) {

			new_worker.removeListener("exit", exit_listener); // remove temp listener
			if (new_killer) { // timeout no longer needed
				clearTimeout(new_killer);
			}

			// ok, lets stop old worker
			var killer = null;
			if (options.timeout > 0) { // start timeout if specified
				killer = setTimeout(function() {
					worker.kill("SIGKILL"); // go get'em, killer
				}, options.timeout);
			}

			worker.on("exit", function() {
				if (killer) {
					clearTimeout(killer);
				}

				// exit complete, fire callback
				setTimeout(cb, 250); // slight delay in case other events are piled up
			});

			if (worker.cservice.onWorkerStop === true) {
				worker.send({ cservice: { cmd: "onWorkerStop" } });
			} else {
				worker.kill("SIGTERM"); // exit worker
			}
		
		});
	};
}
