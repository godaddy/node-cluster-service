var
	async = require("async"),
	util = require("util"),
	cservice = require("../../cluster-service")
;

module.exports = function(evt, cb, cmd, options) {
	var pid = parseInt(cmd);
	options = options || {};
	options.timeout = parseInt(options.timeout) || 60000;
	if (cmd !== "all" && !pid) {
		cb("Invalid request. Try help restart");
		return;
	}

	evt.locals.reason = "restart";
	var originalAutoRestart = evt.locals.restartOnFailure;
	evt.locals.restartOnFailure = false;
	
	var workers = evt.service.workers;
	var tasks = [];

	for (var w in workers) {
		var worker = workers[w];
		if (pid && worker.process.pid !== pid) {
			continue; // cannot kill external processes
		}

		tasks.push(getTask(evt, worker, options, (pid ? true : false)));
	}

	if (tasks.length === 0) {
		cb("No workers to restart");
	} else {
		cservice.log("Restarting workers... timeout: ".warn + options.timeout.toString().info);

		async.series(tasks, function(err) {
			evt.locals.restartOnFailure = originalAutoRestart;

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
		command: "restart all|pid { \"option1\": \"value\" }",
		"all|pid": "Required. 'all' to force shutdown of all workers, otherwise the pid of the specific worker to restart",
		"options": "An object of options.",
		"* timeout": "Timeout, in milliseconds, before terminating workers. 0 for infinite wait."
	});
};

function getTask(evt, worker, options, explicitRestart) {
	return function(cb) {

		// kill new worker if takes too long
		var new_killer = null;
		var new_worker = null;

		var exit_listener = function() {
			if (new_killer) {
				clearTimeout(new_killer);
			}
		};

		if (worker.cservice.restart === false && explicitRestart === false) {
			cservice.log("Worker process " + worker.process.pid + " immune to restarts");
			cb();
			return;
		}
		
		if (options.timeout > 0) { // start timeout if specified
			new_killer = setTimeout(function() {
				var w = new_worker;
				new_worker = null;
				if (w) {
					w.removeListener("exit", exit_listener); // remove temp listener
					w.kill("SIGKILL"); // go get'em, killer
				}
				cb("timed out");
			}, options.timeout);
		}

		// lets start new worker
		var new_worker = evt.service.newWorker(worker.cservice, function(err, new_worker) {
			new_worker.removeListener("exit", exit_listener); // remove temp listener
			new_worker = null;
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
				setTimeout(cb, 100); // slight delay in case other events are piled up
			});

			if (worker.cservice.onStop === true) {
				worker.send({ cservice: { cmd: "onWorkerStop" } });
			} else {
				worker.kill("SIGTERM"); // exit worker
			}
		
		});
	};
}
