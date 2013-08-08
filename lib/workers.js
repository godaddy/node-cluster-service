module.exports = function(evt, cb) {
	var workers = evt.service.workers;
	var ret = { workers: [] };
	for (var k in workers) {
		var worker = workers[k];
		ret.workers.push({
			id: worker.id,
			pid: worker.process.pid,
			state: worker.state,
			cservice: worker.cservice
		});
	}
	cb(null, ret);
};

module.exports.more = function(cb) {
	cb(null, {
		command: "workers",
		info: "Returns list of active worker processes."
	});
};
