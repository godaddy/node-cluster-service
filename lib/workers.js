var
	cluster = require("cluster")
;

exports.get = get;

function get() {
	var workers = [];
	var cworkers = cluster.workers;
	for (var k in cworkers) {
		var worker = cworkers[k];
		worker.pid = worker.process.pid;
		workers.push(worker);
	}

	return workers;
}
