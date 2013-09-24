var
	async = require("async"),
	util = require("util"),
	cservice = require("../cluster-service")
;

module.exports = function(evt, cb, cmd, timeout) {
	var pid = parseInt(cmd);
	timeout = parseInt(timeout) || 60000;
	if (typeof cmd !== "string" || (cmd !== "all" && !pid)) {
		cb("Invalid request. Try help restart");
		return;
	}

	evt.locals.reason = "restart";
	var originalAutoRestart = evt.locals.options.restartOnFailure;
	evt.locals.options.restartOnFailure = false;
	
	var workers = evt.service.workers;
	var tasks = [];

	for (var w in workers) {
		var worker = workers[w];
		if (pid && worker.process.pid !== pid) {
			continue; // cannot kill external processes
		}

		tasks.push(getTask(evt, worker, timeout, (pid ? true : false)));
	}

	if (tasks.length === 0) {
		cb("No workers to restart");
	} else {
		cservice.options.log("Restarting workers... timeout: " + timeout);

		async.series(tasks, function(err) {
			evt.locals.options.restartOnFailure = originalAutoRestart;

			if (err) {
				cb(err);
			} else {
				cb(null, tasks.length + " workers restarted successfully");
			}
		});
	}
};

module.exports.more = function(cb) {
	cb(null, {
		info: "Gracefully restart service, waiting up to timeout before terminating workers.",
		command: "restart all|pid [timeout]",
		"all|pid": "Required. 'all' to force shutdown of all workers, otherwise the pid of the specific worker to restart",
		"timeout": "Timeout, in milliseconds, before terminating workers. 0 for infinite wait."
	});
};

function getTask(evt, worker, timeout, explicitRestart) {
	return function(cb) {

		// kill new worker if takes too long
		var new_killer = null;
		var new_worker = null;

		var exit_listener = function() {
			if (new_killer) {
				clearTimeout(new_killer);
			}
		};

		if (worker.cservice.options.restartDisabled === true && explicitRestart === false) {
			cservice.options.log("Worker process " + worker.process.pid + " immune to restarts");
			cb();
			return;
		}
		
		if (timeout > 0) { // start timeout if specified
			new_killer = setTimeout(function() {
				var w = new_worker;
				new_worker = null;
				if (w) {
					w.removeListener("exit", exit_listener); // remove temp listener
					w.kill("SIGKILL"); // go get'em, killer
				}
				cb("timed out");
			}, timeout);
		}

		// lets start new worker
		new_worker = evt.service.newWorker(worker.cservice.workerPath, worker.cservice.cwd, worker.cservice.options, function(err) {
			new_worker.removeListener("exit", exit_listener); // remove temp listener
			new_worker = null;
			if (new_killer) { // timeout no longer needed
				clearTimeout(new_killer);
			}

			// ok, lets stop old worker
			var killer = null;
			if (timeout > 0) { // start timeout if specified
				killer = setTimeout(function() {
					worker.kill("SIGKILL"); // go get'em, killer
				}, timeout);
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
