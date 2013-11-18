var
	cservice = require("../cluster-service"),
	cluster = require("cluster"),
	path = require("path"),
	fs = require("fs"),
	extend = require("extend")
;

module.exports = exports = newWorker;

function newWorker(options, cb) {
	options = extend(true, {}, {
		worker: "./worker.js",
		ready: true,
		count: undefined,
		restart: true,
		cwd: undefined,
		onStop: false
	}, options);
	if (options.worker.indexOf(".") === 0 || (options.worker.indexOf("//") !== 0 && options.worker.indexOf(":\\") < 0)) {
		// resolve if not absolute
		options.worker = path.resolve(options.worker);
	}
	if (fs.existsSync(options.worker) === false) {
		cb && cb("Worker not found: '" + options.worker + "'. Set 'workers' option to proper path.");
		return null;
	}
	options.cwd = options.cwd || process.cwd();
	options.onReady = cb;
	if (options.wasReady === false) {
		options.ready = false; // preserve preference between restarts, etc
	}
	var worker = cluster.fork(options);
	worker.cservice = options;
	worker.on("message", onMessageFromWorker);
	if (worker.cservice.ready === true && typeof cb === "function") {
		cb(null, worker);
	}
	
	return worker;
};

function onMessageFromWorker(msg) {
	var worker = this;
	if (!msg || !msg.cservice || !msg.cservice.cmd) {
		return; // ignore invalid cluster-service messages
	}
	
	switch (msg.cservice.cmd) {
		case "workerReady":
			if (worker.cservice.ready === false) {
				worker.cservice.wasReady = false; // preserve preference between restarts, etc
				worker.cservice.ready = true;
				worker.cservice.onStop = (msg.cservice.onStop === true);
				worker.cservice.onReady && worker.cservice.onReady(null, worker);
			}
		break;
	};
}
