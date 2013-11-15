var
	cluster = require("cluster"),
	colors = require("colors"),
	locals = require("./lib/defaults")
;

module.exports = exports;

exports.control = function(controls){
	require("./lib/control").addControls(controls);
};

exports.start = require("./lib/start");

exports.stop = require("./lib/stop");

exports.debug = require("./lib/util").debug;
exports.log = require("./lib/util").log;
exports.error = require("./lib/util").error;
exports.results = require("./lib/util").results;

exports.trigger = require("./lib/trigger");

exports.workerReady = require("./lib/worker-ready");

Object.defineProperty(exports, "workers", {
	get: require("./lib/workers").get
});

Object.defineProperty(exports, "isMaster", {
	get: function() {
		return cluster.isMaster;
	}
});

Object.defineProperty(exports, "isWorker", {
	get: function() {
		return cluster.isWorker;
	}
});

Object.defineProperty(exports, "options", {
	get: function() {
		return locals.options;
	}
});

Object.defineProperty(exports, "locals", {
	get: function() {
		return locals;
	}
});

exports.newWorker = require("./lib/new-worker");

exports.on = require("./lib/on");

if (cluster.isWorker === true && typeof (cluster.worker.module) === "undefined") {
	// load the worker if not already loaded
	cluster.worker.module = require(process.env.worker);
}
