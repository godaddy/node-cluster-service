
module.exports = function(evt, cb, test_script, timeout) {
	cb();
};

module.exports.more = function(cb) {
	cb(null, "NOT YET IMPLEMENTED");
};
