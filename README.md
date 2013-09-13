# cluster-service

[![Build Status](https://travis-ci.org/godaddy/node-cluster-service.png)](https://travis-ci.org/godaddy/node-cluster-service)


## Install

	npm install cluster-service


## What is it?

The short answer:

	Turns your single process code into a fault-resilient multi-process service with
	built-in REST & CLI support.

The long answer:

	Adds the ability to execute worker processes over N cores for extra service resilience,
	includes worker process monitoring and restart on failure, continuous integration,
	as well as HTTP & command-line interfaces for health checks, cluster commands,
	and custom service commands.


 
## Worker Processes

At the core of DPS Cluster is parent/child process relationship, which is built atop Node's cluster module, allowing all application code to be executed within child processes, even if resource sharing (i.e. tcp/http binding on the same ports).

	// server.js
	var cservice = require("cluster-service");
	cservice.start("./worker", {
		workerCount: os.cpus().length, accessKey: "lksjdf982734",
		onWorkerStop: function() { /* optional cleanup of my worker */ }
	});
	
	// worker.js
	var cservice = require("cluster-service"); 
	cservice.workerReady({
		onWorkerStop: function() {
			/* perform some optional cleanup if you want to control the exit of worker process */
		}
	});
	
	
## Console & REST API

A DPS Cluster Service has two interfaces, the console (stdio), and an HTTP REST API. The two interfaces are treated identical, as console input/output is piped over the REST API. The reason for the piping is that a DPS Cluster Service is intentionally designed to only support one version of the given service running at any one time, and the port binding is the resource constraint. This allows secondary services to act as console-only interfaces as they pipe all input/output over HTTP to the already running service that owns the port. This flow enables the CLI to background processes.
The REST API is locked to a "accessKey" expected in the query string. The console automatically passes this key to the REST API, but for external REST API access, the key will need to be known.

	{ cluster: { host: "localhost", port: 11987, accessKey: "lksjdf982734" } }


## Auto Restart

By default, a worker (child) process that exits unexpectedly will be restarted. This can be configured to prevent processes from dieing too frequently, in the case the desired outcome is to fail completely if there is something seriously wrong with the workers.

	{ cluster: { autoRestart: true, restartDelayMs: 100, restartsPerMinute: 10 } }


## Continuous Integration

Combining the Worker Process (Cluster) model with a CLI piped REST API enables the ability command the already-running service to replace existing workers with workers in a different location. This capability is still a work in progress, but initial tests are promising.

* Cluster Service A1 starts
* N child worker processes started
* Cluster Service A2 starts
* A2 pipes CLI to A1
* A2 issues "upgrade" command
* A1 spins up A2 worker
* New worker is monitored for N seconds for failure, and cancels upgrade if failure occurs
* Remaining N workers are replaced, one by one, until all are running A2 workers
* Upgrade reports success
 

## Cluster Commands

While a Cluster Service may provide its own custom commands, below are provided out-of-the-box. Commands may be disabled by overriding them.

* start workerPath [cwd] [timeout:60] - Gracefully start service, one worker at a time.
* restart all|pid [timeout:60] - Gracefully restart service, waiting up to timeout before terminating workers.
* shutdown all|pid [timeout:60] - Gracefully shutdown service, waiting up to timeout before terminating workers.
* exit now - Forcefully exits the service.
* help [cmd] - Get help.
* test testScript [timeout:0] - (NOT YET IMPLEMENTED) A path to the test_script must be provided to perform tests against the code base within the given environment. If success (or failure) is not reported within the allotted timeout (in milliseconds, 0 for infinite), the test will be cancelled and considered a failure.
* upgrade all|pid workerPath [cwd] [timeout:60] - Gracefully upgrade service, one worker at a time. (for continuous integration support).
* workers - Returns list of active worker processes.
* health - Returns health of service. Can be overidden by service to expose app-specific data.


## Cluster Events

Events are emitted to interested parties.

* workerStart (pid, reason) - Upon exit of any worker process, the process id of the exited worker. Reasons include: "start", "restart", "failure", and "upgrade".
* workerExit (pid, reason) - Upon start of any worker process. Reasons include: "start", "restart", "failure", and "upgrade".


## Commands & Events

Creating custom, or overriding commands and events is as simple as:

	var cservice = require("cluster-service");
	cservice.on("custom", function(evt, cb, arg1, arg2) { // "custom" command
		// can also fire custom events
		dpscluster.trigger("on.custom.complete", 1, 2, 3);
	};
	
	cservice.on("test", function(evt, cb, testScript, timeout) { // we're overriding the "test" command
		// arguments
		// do something, no callback required (events may optionally be triggered)
	}; 
	
	// can also issue commands programatically
	cservice.trigger("custom", function(err) { /* my callback */ }, "arg1value", "arg2value");

## Unit Tests

Unit tests can be run using [nodeunit](https://github.com/caolan/nodeunit). You can run this shell command from the root of the project:

Windows:

	npm install mocha -g
    npm test

Everyone else:

    npm test

or individual tests...

	node test test-exit


## Code Coverage

Run:

	node_modules\.bin\istanbul cover node_modules\mocha\bin\_mocha -- -u exports -R spec

Now you can view the coverage here:

	coverage/lcov-report/index.html
