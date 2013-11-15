var
	os = require("os")
;

module.exports = exports = {
	firstTime: true,
	events: {},
	workers: {},
	state: 0, // 0-not running, 1-starting, 2-running
	isAttached: false, // attached to CLI over REST
	workerReady: false,
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
};
