var
	cservice = require("../cluster-service"),
	cluster = require("cluster"),
	onWorkerStop = null
;

module.exports = exports = workerReady;

function workerReady(options) {
	if (cluster.isMaster === true) {
		return; // ignore if coming from master
	}

	if (cservice.locals.workerReady === true) {
		return; // ignore dup calls
	}

	cservice.locals.workerReady = true;

	options = options || {};

	onWorkerStop = options.onWorkerStop;
	
	process.on("message", onMessageFromMaster);

	// allow worker to inform the master when ready to speed up initialization	
	process.send({ cservice: { cmd: "workerReady", onStop: (typeof options.onWorkerStop === "function") } });
}

function onMessageFromMaster(msg) {
	var worker = cluster.worker;

	if (!msg || !msg.cservice || !msg.cservice.cmd) {
		return; // ignore invalid cluster-service messages
	}

	switch (msg.cservice.cmd) {
		case "onWorkerStop":
			if (typeof onWorkerStop === "function") {
				onWorkerStop();
			}
		break;
	};
}
