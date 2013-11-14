var
	cluster = require("cluster"),
	extend = require("extend"),
	os = require("os"),
	util = require("util"),
	path = require("path"),
	colors = require("colors"),
	httpserver = null,
	control = null,
	cli = null,
	locals = {
		firstTime: true,
		events: {},
		workers: {},
		state: 0, // 0-not running, 1-starting, 2-running
		isAttached: false, // attached to CLI over REST
		workerReady: false,
		onWorkerStop: true,
		restartOnFailure: true,
		options: {
			host: "localhost",
			port: 11987,
			accessKey: undefined,
			workers: undefined,
			workerCount: os.cpus().length,
			restartDelayMs: 100,
			allowHttpGet: false, // useful for testing -- not safe for production use
			restartsPerMinute: 10, // not yet supported
			cli: true,
			silent: false,
			log: console.log,
			error: console.error,
			debug: console.debug,
			json: false, // output as JSON
			colors: {
			    cservice: "grey",
			    success: "green",
			    error: "red",
			    data: "cyan",
			    warn: "yellow",
			    info: "magenta",
                debug: "grey"
			},
			error: console.error
		}
	}
;

if (cluster.isMaster === true) {
	// some modules are reserved for master only
	httpserver = require("./lib/http-server");
	control = require("./lib/control");
}

module.exports = exports;

exports.control = function(controls){
	control.addControls(controls);
};

exports.start = function(options, masterCb) {
	if (cluster.isWorker === true) {
		// ignore starts if not master. do NOT invoke masterCb, as that is reserved for master callback
		
		return;
	}

	if (arguments.length === 0) {
		var argv = require("optimist").argv;

		options = argv; // use command-line arguments instead
		if (options._ && options._.length > 0) {
			var ext = path.extname(options._[0]).toLowerCase();
			if (ext === ".js") { // if js file, use as worker
				options.workers = options._[0];
			} else if (ext === ".json") { // if json file, use as config
				options.config = options._[0];
			} else { // otherwise assume it is a command to execute
			    options.run = options._[0];
			    if (options.json === true) {
			        options.cli = false;
			    }
			}
		}
	}
	
	options = options || {};
	if ("config" in options) {
		options = JSON.parse(fs.readFileSync(options.config));
		workerPath = null;
	}
	delete locals.options.workers; // always replace workers, not extend it
	locals.options = options = extend(true, locals.options, options);
	if (typeof options.workers === "undefined") {
		// only define default worker if worker is undefined (null is reserved for "no worker")
		options.workers = "./worker.js"; // default worker to execute
	}
	
	colors.setTheme(options.colors);

	require("./lib/legacy");
	
	if (options.run) {
		require("./lib/run").start(options, function(err, result) {
			process.exit(1); // graceful exit
		});
	} else {	
		require("./lib/master").start(options, masterCb);
	}
};

exports.stop = function(timeout, cb) {
	if (locals.state === 0) {
		cb && cb();
		return;
	}

	if (exports.workers.length > 0) { // issue shutdown
		exports.trigger("shutdown", function() {
			httpserver.close();
			if (cli) {
				process.exit(1);
			} else {
				cb && cb();
			}
		}, "all", timeout);
	} else { // gracefully shutdown
		httpserver.close();
		locals.state = 0;
		if (cli) {
			process.exit(1);
		} else {
			cb && cb();
		}
	}
};

exports.on = function(eventName, cb, overwriteExisting) {
	if (cluster.isMaster === false) {
		return; // no action to take on workers -- convenience feature as to not pollute master code
	}

	overwriteExisting = overwriteExisting || true;
	if (!overwriteExisting && eventName in locals.events) {
		return; // do not overwrite existing
	}

	var evt = {
		name: eventName,
		service: exports,
		locals: locals,
		cb: cb
	};

	// Adding control for this eventName
	if (typeof cb.control === "function"){
		var controls = {};
		controls[eventName] = cb.control();
		control.addControls(controls);
	}
	
	// overwrite existing, if any
	locals.events[eventName] = evt;
};

if (cluster.isMaster === true && locals.firstTime === true) {
	locals.firstTime = false;

	// only register listeners if master
	exports.on("start", require("./lib/commands/start"), false);
	exports.on("restart", require("./lib/commands/restart"), false);
	exports.on("shutdown", require("./lib/commands/shutdown"), false);
	exports.on("exit", require("./lib/commands/exit"), false);
	exports.on("help", require("./lib/commands/help"), false);
	exports.on("upgrade", require("./lib/commands/upgrade"), false);
	exports.on("workers", require("./lib/commands/workers"), false);
	exports.on("health", require("./lib/commands/health"), false);
	exports.on("version", require("./lib/commands/version"), false);
	exports.on("v", require("./lib/commands/version"), false);
	exports.on("workerStart", function(evt, pid, reason) {
		exports.log(("worker " + pid.data + " start, reason: " + (reason || locals.reason)).success);
	}, false);
	exports.on("workerExit", function(evt, pid, reason) {
		exports.log(("worker " + pid.data + " exited, reason: " + (reason || locals.reason)).warn);
	}, false);
}

exports.debug = function () {
    if (locals.options.cli === true && locals.options.debug) {
        var args = Array.prototype.slice.call(arguments);
        for (var i = 0; i < args.length; i++) {
            if (typeof args[i] === "string") {
                args[i] = args[i].debug;
            }
        }
        if (args.length > 0 && typeof args[0] === "string" && args[0][0] === "{") {
            locals.options.debug("cservice:".cservice);
        } else {
            args = ["cservice: ".cservice].concat(args);
        }
        locals.options.debug.apply(this, args);
    }
};

exports.log = function () {
    if (locals.options.cli === true && locals.options.log) {
        var args = Array.prototype.slice.call(arguments);
        if (args.length > 0 && typeof args[0] === "string" && args[0][0] === "{") {
            locals.options.log("cservice:".cservice);
        } else {
            args = ["cservice: ".cservice].concat(args);
        }
        locals.options.log.apply(this, args);
	}
};

exports.error = function() {
	if (locals.options.cli === true && locals.options.error) {
	    var args = Array.prototype.slice.call(arguments);
	    for (var i = 0; i < args.length; i++) {
			if (typeof args[i] === "string") {
				args[i] = args[i].error;
			}
		}
	    if (args.length > 0 && typeof args[0] === "string" && args[0][0] === "{") {
	        locals.options.error("cservice:".cservice);
	    } else {
	        args = ["cservice: ".cservice].concat(args);
	    }
	    locals.options.error.apply(this, args);
	}
};

exports.results = function() {
	locals.options.log &&
		locals.options.log.apply(this, arguments);
};

exports.trigger = function(eventName) {
	var evt = locals.events[eventName];
	if (!evt) {
		throw new Error("Event " + eventName + " not found");
	}

	var args = [evt]; // event is always first arg
	if (arguments.length > 1) { // grab custom args
		for (var i = 1; i < arguments.length; i++) {
			args.push(arguments[i]);
		}
	}
//exports.log("trigger." + eventName + ".args=" + args.length);
	// invoke event callback
	return evt.cb.apply(null, args);
};

exports.workerReady = function(options) {
	if (cluster.isMaster === true) {
		return; // ignore if coming from master
	}

	if (locals.workerReady === true) {
		return; // ignore dup calls
	}

	locals.workerReady = true;

	options = options || {};

	locals.onWorkerStop = options.onWorkerStop;
	
	process.on("message", onMessageFromMaster);

	// allow worker to inform the master when ready to speed up initialization	
	process.send({ cservice: { cmd: "workerReady", onStop: (typeof options.onWorkerStop === "function") } });
};

Object.defineProperty(exports, "workers", {
	get: function() {
		var workers = [];
		var cworkers = cluster.workers;
		for (var k in cworkers) {
			var worker = cworkers[k];
			worker.pid = worker.process.pid;
			workers.push(worker);
		}
	
		return workers;
	}
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

exports.newWorker = function(options, cb) {
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

function onMessageFromMaster(msg) {
	var worker = cluster.worker;

	if (!msg || !msg.cservice || !msg.cservice.cmd) {
		return; // ignore invalid cluster-service messages
	}

	switch (msg.cservice.cmd) {
		case "onWorkerStop":
			if (typeof locals.onWorkerStop === "function") {
				locals.onWorkerStop();
			}
		break;
	};
}

if (cluster.isWorker === true && typeof (cluster.worker.module) === "undefined") {
	// load the worker if not already loaded
	cluster.worker.module = require(process.env.worker);
}
