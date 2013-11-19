module.exports = function(evt, cb, cmd) {
	var workers = evt.service.workers;

	var ret = { };
	cmd = cmd || "simple";
	switch (cmd) {
		case "details":
			ret.workers = workers;
		break;
		default:
			ret.workers = workerSummary(workers);
		break;
	}
	
	cb(null, ret);
};

module.exports.more = function(cb) {
	cb(null, {
		command: "workers [simple|details]",
		info: "Returns list of active worker processes.",
		"simple|details": "Defaults to 'simple'.",
		"* simple": "Simple overview of running workers.",
		"* details": "Full details of running workers."
	});
};

function workerSummary(workers) {
	var ret = [];
	
	for (var i = 0; i < workers.length; i++) {
		var w = workers[i];
		ret.push({
			id: w.id,
			pid: w.pid,
			state: w.state,
			worker: w.cservice.worker,
			cwd: w.cservice.cwd
		});
	}
	
	return ret;
}
