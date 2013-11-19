var
	cservice = require("../cluster-service"),
	cluster = require("cluster"),
	httpserver = require("./http-server"),
	startRequests = [] // queued start requests
;

exports.start = startMaster;

function startMaster(options, cb) {
	options = options || {};
	options.workerCount = options.workerCount || 1;

	if (cservice.locals.state === 0) { // one-time initializers
		cservice.locals.state = 1; // starting
		
		require("./commands/version")({}, function(err, ver) {
			cservice.log("cluster-service v".info + ver.data + " starting...".info);
		});
		
		/*process.on("uncaughtException", function(err) {
			cservice.log("uncaughtException", util.inspect(err));
		});*/
		
		// queue up our request
		startRequests.push(function() {
			startMaster(options, cb);
		});
		
		startListener(options, function(err) {
			if (err) {
				cservice.locals.isAttached = true;

				// start the http client
				require("./http-client").init(cservice.locals, options);
			} else { // we're the single-master	
				cservice.locals.isAttached = false;

				cluster.setupMaster({ silent: (options.silent === true) });
				
				cluster.on("online", function(worker) {
					cservice.trigger("workerStart", worker.process.pid);
				});

				cluster.on("exit", function(worker, code, signal) {
					cservice.trigger("workerExit", worker.process.pid);

					// do not restart if there is a reason, or disabled
					if (typeof (cservice.locals.reason) === "undefined" && worker.suicide !== true && cservice.locals.restartOnFailure === true) {
						setTimeout(function() {
							// lets replace lost worker.
							cservice.newWorker(worker.cservice);
						}, options.restartDelayMs);
					}
				});

				if (options.cli === true) {
					// wire-up CLI
					require("./cli").init(cservice.locals, options);
				}
			}

			cservice.locals.state = 2; // running

			// now that listener is ready, process queued start requests
			for (var i = 0; i < startRequests.length; i++) {
				startRequests[i](); // execute
			}
			startRequests = [];
		});
	} else if (cservice.locals.state === 1) { // if still starting, queue requests
		startRequests.push(function() {
			startMaster(options, cb);
		});
	} else if (cservice.locals.isAttached === false && options.workers !== null) { // if we're NOT attached, we can spawn the workers now
		// fork it, i'm out of here
		var workersRemaining = 0;
		var workersForked = 0;
		var workers = typeof options.workers === "string" ? { main: { worker: options.workers } } : options.workers;
		var i;
		for (var workerName in workers) {
			var worker = workers[workerName];
			var workerCount = worker.count || options.workerCount;
			workersRemaining += workerCount;
			workersForked += workerCount;
			for (i = 0; i < workerCount; i++) {
				cservice.newWorker(worker, function(err) {
					workersRemaining--;
					if (err) {
						workersRemaining = 0; // callback now
					}
					if (workersRemaining === 0) {
						cb && cb(err);
					}
				});
			}
		}
		if (workersForked === 0) { // if no forking took place, make sure cb is invoked
			cb && cb();
		}
	} else { // nothing else to do
		cb && cb();
	}
};

function startListener(options, cb) {
	if (typeof options.accessKey !== "string") { // in-proc mode only
	    cservice.log("LOCAL ONLY MODE. Run with 'accessKey' option to enable communication channel.".info);
		cb();
		return;
	}
	
	httpserver.init(cservice.locals, options, function(err) {
		if (!err) {
			cservice.log(("Listening at " + ((options.ssl ? "https://" : "http://") + options.host + ":" + options.port + "/cli").data).info);
		}

		cb(err);	
	});
}
