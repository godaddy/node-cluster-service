module.exports = function(evt, cb) {
	var workers = evt.service.workers;
	var ret = { workers: workers };
	cb(null, ret);
};

module.exports.more = function(cb) {
	cb(null, {
		command: "workers",
		info: "Returns list of active worker processes."
	});
};
