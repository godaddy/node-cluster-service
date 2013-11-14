# cluster-service

[![Build Status](https://travis-ci.org/godaddy/node-cluster-service.png)](https://travis-ci.org/godaddy/node-cluster-service) [![NPM version](https://badge.fury.io/js/cluster-service.png)](http://badge.fury.io/js/cluster-service) [![Dependency Status](https://gemnasium.com/godaddy/node-cluster-service.png)](https://gemnasium.com/godaddy/node-cluster-service)


## Install

	npm install cluster-service

https://npmjs.org/package/cluster-service


## About

The short answer:

	Turns your single process code into a fault-resilient multi-process service with
	built-in REST & CLI support.

The long answer:

	Adds the ability to execute worker processes over N cores for extra service resilience,
	includes worker process monitoring and restart on failure, continuous deployment,
	as well as HTTP & command-line interfaces for health checks, cluster commands,
	and custom service commands.


 
## Getting Started

Turning your single process node app/service into a fault-resilient multi-process service with all of the bells and whistles has never been easier!

Your existing application, be it console app or service of some kind:

	// server.js
	console.log("Hello World");

Leveraging ```cluster-service``` without adding a line of code:

	npm install -g cluster-service
	cservice "server.js" --accessKey "lksjdf982734"

This can be done without a global install as well, by updating your ```package.json```:

	"scripts": {
		"start": "cservice server.js --accessKey lksjdf982734"
	},
	"dependencies": {
		"cluster-service": ">=0.5.0"
	}

Now we can leverage ```npm``` to find our local install of ```cluster-service```:

	npm start

Or, if you prefer to control ```cluster-service``` within your code:

	// server.js
	require("cluster-service").start({ workers: "./worker.js", accessKey: "lksjdf982734" });

	// worker.js
	console.log("Hello World"); // notice we moved our original app logic to the worker



## Talk to it

Now that your service is resilient to worker failure, and utilizing all cores of your machine, lets talk to it.
With your service running, type into the command-line:

	restart all

or for a full list of commands...

	help

or for help on a specific command:

	help {command}
	
We can also issue commands from a seperate process, or even a remote machine (assuming proper access):

	npm install -g cluster-service
	cservice "restart all" --accessKey "my_access_key"

You can even pipe raw JSON, which can be parsed and processed by the caller:

	cservice "restart all" --accessKey "my_access_key" --json

Check out ***Cluster Commands*** for more details.


## Start Options

When initializing your service, you have a number of options available:

	cservice "config.json"

Or within your node app:

	// server.js
	// inline options
	require("cluster-service").start({ workers: "worker.js", accessKey: "123" });
	// or via config
	require("cluster-service").start({ config: "config.json" });

* workers (default: "./worker.js") - Path of worker to start. A string indicates a single worker,
  forked based on value of ```workerCount```. An object indicates one or more worker objects:
  ```{ "worker1": { workers: "worker1.js", cwd: process.cwd(), count: 2, ready: true, restart: true } }```.
  This option is automatically set if run via command-line ```cservice "worker.js"``` if
  the ```.js``` extension is detected.
* accessKey - A secret key that must be specified if you wish to invoke commands to your service.
  Allows CLI & REST interfaces.
* config - A filename to the configuration to load. Useful to keep options from having to be inline.
  This option is automatically set if run via command-line ```cservice "config.json"``` if
  the ```.json``` extension is detected.
* host (default: "localhost") - Host to bind to for REST interface. (Will only bind if accessKey
  is provided)
* port (default: 11987) - Port to bind to. If you leverage more than one cluster-service on a
  machine, you'll want to assign unique ports. (Will only bind if accessKey is provided)
* workerCount (default: os.cpus().length) - Gives you control over the number of processes to
  run the same worker concurrently. Recommended to be 2 or more for fault resilience. But some
  workers do not impact availability, such as task queues, and can be run as a single instance.
* cli (default: true) - Enable the command line interface. Can be disabled for background
  services, or test cases.
* ssl - If provided, will bind using HTTPS by passing this object as the
  [TLS options](http://nodejs.org/api/tls.html#tls_tls_createserver_options_secureconnectionlistener).
* run - Ability to run a command, output result in json, and exit. This option is automatically
  set if run via command-line ```cservice "restart all"``` and no extension is detected.
* json - If specified in conjunction with ```run```, will *only* output the result in JSON for
  consumption from other tasks/services. No other data will be output.
* silent (default: false) - If true, forked workers will not send their output to parent's stdio.
* allowHttpGet (default: false) - For development purposes, can be enabled for testing, but is
  not recommended otherwise.
  

## Console & REST API

A DPS Cluster Service has two interfaces, the console (stdio), and an HTTP REST API. The two
interfaces are treated identical, as console input/output is piped over the REST API. The
reason for the piping is that a DPS Cluster Service is intentionally designed to only
support one instance of the given service running at any one time, and the port binding
is the resource constraint. This allows secondary services to act as console-only
interfaces as they pipe all input/output over HTTP to the already running service
that owns the port. This flow enables the CLI to background processes.
The REST API is locked to a "accessKey" expected in the query string. The console
automatically passes this key to the REST API, but for external REST API access,
the key will need to be known.

	{ host: "localhost", port: 11987, accessKey: "lksjdf982734" }

Invoking the REST interface directly would look something like:

	curl -d "" "http://localhost:11987/cli?cmd=help&accessKey=lksjdf982734"

Or better yet, use the ```run``` option to do the work for you:

	cservice "help" --accessKey "lksjdf982734"
	// same as
	cservice --run "help" --accessKey "lksjdf982734"
	


## Cluster Commands

While a Cluster Service may provide its own custom commands, below are provided out-of-the-box.
Commands may be disabled by overriding them.

* start workerPath [cwd] { [timeout:60] } - Gracefully start service, one worker at a time.
* restart all|pid { [timeout:60] } - Gracefully restart service, waiting up to timeout before terminating workers.
* shutdown all|pid { [timeout:60] } - Gracefully shutdown service, waiting up to timeout before terminating workers.
* exit now - Forcefully exits the service.
* help [cmd] - Get help.
* upgrade all|pid workerPath { [cwd] [timeout:60] } - Gracefully upgrade service, one worker at a time. (continuous deployment support).
* workers - Returns list of active worker processes.
* health - Returns health of service. Can be overidden by service to expose app-specific data.



## Commands & Events

Creating custom, or overriding commands and events is as simple as:

	var cservice = require("cluster-service");
	cservice.on("custom", function(evt, cb, arg1, arg2) { // "custom" command
		// can also fire custom events
		cservice.trigger("on.custom.complete", 1, 2, 3);
	};
	
	cservice.on("test", function(evt, cb, testScript, timeout) { // we're overriding the "test" command
		// arguments
		// do something, no callback required (events may optionally be triggered)
	}; 
	
	// can also issue commands programatically
	cservice.trigger("custom", function(err) { /* my callback */ }, "arg1value", "arg2value");



## Cluster Events

Events are emitted to interested parties.

* workerStart (pid, reason) - Upon exit of any worker process, the process id of the exited worker. Reasons include: "start", "restart", "failure", and "upgrade".
* workerExit (pid, reason) - Upon start of any worker process. Reasons include: "start", "restart", "failure", and "upgrade".



## Async Support

By default, when a process is started successfully without it exiting, it is assumed to be "running".
This behavior is not always desired however, and may optionally be controlled by:

Indicate the worker is NOT ready, via ```ready``` option:

	require("cluster-service").start({ workers: { "async_worker.js": { ready: false } } });

Have the worker inform the master once it is actually ready:

	// worker.js
	setTimeout(funtion() {
		// dumb example of async support
		require("cluster-service").workerReady(); // we're ready!
	});

Additionally, a worker may optionally perform cleanup tasks prior to exit, via:

	// worker.js
	require("cluster-service").workerReady({
		onWorkerStop: function() { /* lets clean this place up */ }
	});
	
	

## Access Control

Commands may be granted "inproc" (no trust), "local" (low trust), or "remote" (default). Setting
access control at compile time can be done within the command, like so:

```javascript
// exit.js
module.exports.control = function(){
	return "local";
};
```

Or may be overriden at runtime via:

```javascript
// server.js
require("cluster-service").control({ "exit": "local" });
```



## Continuous Deployment

Combining the Worker Process (Cluster) model with a CLI piped REST API enables the ability
to command the already-running service to replace existing workers with workers in a
different location. This capability is still a work in progress, but initial tests are promising.

* Cluster Service A1 starts
* N child worker processes started
* Cluster Service A2 starts
* A2 pipes CLI to A1
* A2 issues "upgrade" command
* A1 spins up A2 worker
* New worker is monitored for N seconds for failure, and cancels upgrade if failure occurs
* Remaining N workers are replaced, one by one, until all are running A2 workers
* Upgrade reports success

	

## Tests & Code Coverage

Download and install:

	git clone https://github.com/godaddy/node-cluster-service.git
	cd node-cluster-service
	npm install

Now test:	

	npm test

View code coverage in any browser:

	coverage/lcov-report/index.html

	

## License

[MIT](https://github.com/godaddy/node-cluster-service/blob/master/LICENSE.txt)
