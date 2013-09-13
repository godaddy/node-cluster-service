
module.exports = function(evt, cb, testScript, timeout) {
	cb();
};

module.exports.more = function(cb) {
	cb(null, "NOT YET IMPLEMENTED");
};
