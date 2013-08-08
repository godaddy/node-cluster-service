var
	cluster = require("cluster"),
	extend = require("extend"),
	os = require("os"),
	util = require("util"),
	path = require("path"),
	locals = {
		events: {},
		workers: {},
		state: 0, // 0-not running, 1-starting, 2-running
		isAttached: false, // attached to CLI over REST
		workerReady: false,
		onWorkerStop: true,
		startRequests: [], // queued start requests
		options: {
			host: "localhost",
			port: 11987,
			restartOnFailure: true,
			restartDisabled: false,
			workerCount: os.cpus().length,
			restartDelayMs: 100,
			allowHttpGet: false, // useful for testing -- not safe for production use
			restartsPerMinute: 10 // not yet supported
		}
	}
;

exports.start = function(workerPath, options, cb) {
	options = extend(true, {}, locals.options, options);

	if (cluster.isMaster) {
		startMaster(workerPath, options, cb);
	} else {
		// only load worker for on worker processes
		startWorker(cb);
	}

};

exports.stop = function(timeout) {
	if (locals.state === 0) {
		throw "Must be running";
	}

	exports.trigger("exit", timeout);
};

exports.on = function(eventName, cb, overwriteExisting) {
	if (cluster.isMaster === false) {
		return; // no action to take on workers -- convenience feature as to not pollute master code
	}

	overwriteExisting = overwriteExisting || true;

	var evt = {
		name: eventName,
		service: exports,
		locals: locals,
		cb: cb
	};

	// overwrite existing, if any
	locals.events[eventName] = evt;
};

exports.trigger = function(eventName) {
	if (locals.state === 0) {
		throw "Must be running";
	}
	
	var evt = locals.events[eventName];
	if (!evt) {
		throw "Event " + eventName + " not found";
	}

	var args = [evt]; // event is always first arg
	if (arguments.length > 1) { // grab custom args
		for (var i = 1; i < arguments.length; i++) {
			args.push(arguments[i]);
		}
	}

	// invoke event callback
	return evt.cb.apply(null, args);
};

exports.workerReady = function(options) {
	if (cluster.isMaster === true) {
		throw "Cannot call workerReady from master...";
	}

	if (locals.workerReady === true) {
		return; // ignore dup calls
	}

	locals.workerReady = true;

	options = options || {};

	locals.onWorkerStop = options.onWorkerStop;
	
	process.on("message", onMessageFromMaster);

	// allow worker to inform the master when ready to speed up initialization	
	process.send({ cservice: { cmd: "workerReady", onWorkerStop: (typeof options.onWorkerStop === "function") } });
};

Object.defineProperty(exports, "workers", {
	get: function() {
		return cluster.workers;
	}
});

Object.defineProperty(exports, "options", {
	get: function() {
		return locals.options;
	}
});

exports.newWorker = function(workerPath, cwd, options, cb) {
	if (typeof options === "function") {
		cb = options;
		options = {};
	}
	workerPath = workerPath || "./worker";
	if (workerPath.indexOf(".") === 0 || (workerPath.indexOf("//") !== 0 && workerPath.indexOf(":\\") < 0)) {
		// resolve if not absolute
		workerPath = path.resolve(workerPath);
	}

	var worker = cluster.fork({ "workerPath": workerPath, "cwd": (cwd || process.cwd()) });
	worker.cservice = { workerReady: false, onWorkerStop: false, onWorkerReady: cb, workerPath: workerPath, options: options || {} };
	worker.on("message", onMessageFromWorker);
	
	return worker;
};

function startMaster(workerPath, options, cb) {
	if (typeof workerPath !== "string") {
		throw new Error("workerPath MUST be provided when starting your service");
	}

	options = options || {};
	options.workerCount = options.workerCount || 1;

	var listener = null;
	
	if (locals.state === 0) { // one-time initializers
		if (typeof options.accessKey !== "string") {
			throw new Error("accessKey option is required");
		}

		locals.state = 1; // starting

		listener = function(err) {
		};
		
		/*process.on("uncaughtException", function(err) {
			console.log("uncaughtException", util.inspect(err));
		});*/
		
		// only register listeners if master
		exports.on("start", require("./lib/start"), false);
		exports.on("restart", require("./lib/restart"), false);
		exports.on("shutdown", require("./lib/shutdown"), false);
		exports.on("exit", require("./lib/exit"), false);
		exports.on("help", require("./lib/help"), false);
		exports.on("test", require("./lib/test"), false);
		exports.on("upgrade", require("./lib/upgrade"), false);
		exports.on("workers", require("./lib/workers"), false);
		exports.on("health", require("./lib/health"), false);
		exports.on("options", require("./lib/options"), false);
		exports.on("workerStart", function(evt, pid, reason) {
			console.log("worker " + pid + " start, reason: " + (reason || locals.reason));
		}, false);
		exports.on("workerExit", function(evt, pid, reason) {
			console.log("worker " + pid + " exited, reason: " + (reason || locals.reason));
		}, false);

		// queue up our request
		locals.startRequests.push(function() {
			startMaster(workerPath, options, cb);
		});
		
		startListener(options, function(err) {
			if (err) {
				locals.isAttached = true;

				// start the http client
				require("./lib/http-client").init(locals, options);
			} else { // we're the single-master	
				locals.isAttached = false;

				// init cluster
				cluster.setupMaster({
					silent: false
				});

				cluster.on("online", function(worker) {
					exports.trigger("workerStart", worker.process.pid);
				});

				cluster.on("exit", function(worker, code, signal) {
					exports.trigger("workerExit", worker.process.pid);

					if (worker.suicide !== true && options.restartOnFailure === true) {
						setTimeout(function() {
							// lets replace lost worker. should we wait a second or two? rather not.
							exports.newWorker(worker.cservice.workerPath, null, options);
						}, options.restartDelayMs);
					}
				});

				// wire-up CLI
				require("./lib/cli").init(locals, options);
			}

			locals.state = 2; // running

			// now that listener is ready, process queued start requests
			for (var i = 0; i < locals.startRequests.length; i++) {
				locals.startRequests[i](); // execute
			}
		});

		return;
	} else if (locals.state === 1) { // if still starting, queue requests
		locals.startRequests.push(function() {
			startMaster(workerPath, options, cb);
		});
		return;
	} else if (locals.isAttached === false) { // if we're NOT attached, we can spawn the workers now		
		// fork it, i'm out of here
		for (var i = 0; i < options.workerCount; i++) {
			exports.newWorker(workerPath, null, options);
		}
	}

	cb && cb();
}

function onMessageFromWorker(msg) {
	var worker = this;
	if (!msg || !msg.cservice || !msg.cservice.cmd) {
		return; // ignore invalid cluster-service messages
	}
	
	switch (msg.cservice.cmd) {
		case "workerReady":
			if (worker.cservice.workerReady === false) {
				worker.cservice.workerReady = true;
				worker.cservice.onWorkerStop = (msg.cservice.onWorkerStop === true);
				worker.cservice.onWorkerReady && worker.cservice.onWorkerReady();
			}
		break;
	};
}

function onMessageFromMaster(msg) {
	var worker = cluster.worker;

	if (!msg || !msg.cservice || !msg.cservice.cmd) {
		return; // ignore invalid cluster-service messages
	}

	switch (msg.cservice.cmd) {
		case "onWorkerStop":
			if (typeof locals.onWorkerStop === "function") {
				locals.onWorkerStop();
			}
		break;
	};
}

function startWorker(cb) {
	cluster.worker.module = require(process.env.workerPath);

	cb && cb();
}

function startListener(options, cb) {
	require("./lib/http-server").init(locals, options, function(err) {
		if (!err) {
			console.log("cluster-service is listening at " + options.host + ":" + options.port);
		}

		cb(err);	
	});
}
