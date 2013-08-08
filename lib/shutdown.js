var
	util = require("util")
;

module.exports = function(evt, cb, cmd, timeout) {
	var pid = parseInt(cmd);
	timeout = parseInt(timeout) || 60000;
	if (typeof cmd !== "string" || (cmd !== "all" && !pid)) {
		cb("Invalid request. Try help shutdown");
		return;
	}

	evt.locals.reason = "shutdown";
		
	var workers = evt.service.workers;
	var exiting = false;
	for (var w in workers) {
		var worker = workers[w];
		if (pid && worker.process.pid !== pid) {
			continue; // cannot kill external processes
		}

		exiting = true;
		
		var killer = null;
		if (timeout > 0) { // start timeout if specified
			killer = setTimeout(getKiller(worker), timeout);
		}
		worker.process.on("exit", function() {
			if (killer) {
				clearTimeout(killer);
			}

			var first_worker;
			for (first_worker in evt.service.workers) {
				break;
			}
			
			if (!first_worker) {
				evt.locals.reason = "kill";
				console.log("All workers shutdown. Exiting...");
				process.exit(0); // exit master
				cb(); // DONE
			}
			else if (pid) { // only one worker needed to exit
				cb(null, "Worker shutdown"); // DONE
			}
		});
		if (worker.onWorkerStop === true) {
			worker.send({ cservice: { cmd: "onWorkerStop" } });
		} else {
			worker.kill("SIGTERM"); // exit worker
		}
	}
	
	if (exiting === false) {
		var first_worker;
		for (first_worker in evt.service.workers) {
			break;
		}

		if (!first_worker) {
			evt.locals.reason = "kill";
			console.log("All workers shutdown. Exiting...");
			process.exit(0); // exit master

			cb();
		} else {
			cb("No workers were shutdown");
		}
	} else {
		console.log("Killing workers... timeout: " + (timeout || 0));
	}
};

module.exports.more = function(cb) {
	cb(null, {
		info: "Gracefully shutdown service, waiting up to timeout before terminating workers.",
		command: "shutdown all|pid [timeout]",
		"all|pid": "Required. 'all' to force shutdown of all workers, otherwise the pid of the specific worker to shutdown",
		"timeout": "Timeout, in milliseconds, before terminating workers. 0 for infinite wait."
	});
};

function getKiller(worker) {
	return function() {
		worker.kill("SIGKILL"); // go get'em, killer
	};
}
