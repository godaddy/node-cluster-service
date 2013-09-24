var
	util = require("util"),
	cservice = require("../cluster-service")
;

module.exports = function(evt, cb, cmd, timeout) {
	var pid = parseInt(cmd);
	timeout = parseInt(timeout) || 60000;
	if (typeof cmd !== "string" || (cmd !== "all" && !pid)) {
		cb("Invalid request. Try help shutdown");
		return;
	}

	evt.locals.reason = "shutdown";

	var workersToKill = 0;
	
	var workers = evt.service.workers;
	var exiting = false;
	for (var w in workers) {
		var worker = workers[w];
		if (pid && worker.process.pid !== pid) {
			continue; // cannot kill external processes
		}

		exiting = true;
		workersToKill++;
		
		worker.process.on("exit", getExitHandler(evt, worker, timeout > 0 ? setTimeout(getKiller(worker), timeout) : null, function() {
			workersToKill--;
			if (workersToKill === 0) {
				// no workers remain
				if (evt.service.workers.length === 0) {
					evt.locals.reason = "kill";
					cservice.options.log("All workers shutdown. Exiting...");
					evt.service.stop(timeout, cb);
				} else {
					cb(null, "Worker shutdown"); // DONE
				}
			}
		}));
		if (worker.onWorkerStop === true) { // try the nice way first
			worker.send({ cservice: { cmd: "onWorkerStop" } });
		} else {
			worker.kill("SIGTERM"); // exit worker
		}
	}
	
	if (exiting === false) {
		if (evt.service.workers.length === 0) {
			evt.locals.reason = "kill";
			cservice.options.log("All workers shutdown. Exiting...");
			evt.service.stop(timeout, cb);
		} else {
			cb("No workers were shutdown");
		}
	} else {
		cservice.options.log("Killing workers... timeout: " + (timeout || 0));
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

module.exports.control = function(){
	return "local";
};

function getKiller(worker) {
	return function() {
		worker.kill("SIGKILL"); // go get'em, killer
	};
}

function getExitHandler(evt, worker, killer, cb) {
	return function() {
		if (killer) {
			clearTimeout(killer);
			killer = null;
		}
		
		cb();
	};
}