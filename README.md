# cluster-service

[![Build Status](https://travis-ci.org/godaddy/node-cluster-service.png)](https://travis-ci.org/godaddy/node-cluster-service) [![NPM version](https://badge.fury.io/js/cluster-service.png)](http://badge.fury.io/js/cluster-service) [![Dependency Status](https://gemnasium.com/godaddy/node-cluster-service.png)](https://gemnasium.com/godaddy/node-cluster-service) [![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/godaddy/node-cluster-service/trend.png)](https://bitdeli.com/free "Bitdeli Badge")

[![NPM](https://nodei.co/npm/cluster-service.png?downloads=true&stars=true&downloadRank=true)](https://www.npmjs.org/package/cluster-service) [![NPM](https://nodei.co/npm-dl/cluster-service.png?height=2)](https://nodei.co/npm/cluster-service/)

## Install

	npm install cluster-service

https://npmjs.org/package/cluster-service



## About

	Turn your single process code into a fault-resilient, multi-process service with
	built-in REST & CLI support. Restart or hot upgrade your web servers with zero
	downtime or impact to clients.

Presentation:

http://x.co/bpnode

Video:

http://x.co/bpnodevid


## Getting Started

Your existing application, be it console app or service of some kind:

	// server.js
	console.log("Hello World");

Leveraging ```cluster-service``` without adding a line of code:

	npm install -g cluster-service
	cservice "server.js" --accessKey "lksjdf982734"
	// cserviced "server.js" --accessKey "lksjdf982734" // daemon

This can be done without a global install as well, by updating your ```package.json```:

	"scripts": {
		"start": "cservice server.js --accessKey lksjdf982734"
	},
	"dependencies": {
		"cluster-service": ">=0.5.0"
	}

Now we can leverage ```npm``` to find our local install of ```cluster-service```:

	npm start

Or, if you prefer to control ```cluster-service``` within your code, we've got you covered:

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

You can even pipe raw JSON for processing:

	cservice "restart all" --accessKey "my_access_key" --json

Check out ***Cluster Commands*** for more.



## Start Options

When initializing your service, you have a number of options available:

	cservice "server.js" --accessKey "123"

Or via JSON config:

	cservice "config.json"

Or within your node app:

	// server.js
	// inline options
	require("cluster-service").start({ workers: "worker.js", accessKey: "123" });
	// or via config
	require("cluster-service").start({ config: "config.json" });

### Options:

* `workers` - Path of worker to start. A string indicates a single worker,
  forked based on value of ```workerCount```. An object indicates one or more worker objects:
  ```{ "worker1": { worker: "worker1.js", cwd: process.cwd(), count: 2, restart: true } }```.
  This option is automatically set if run via command-line ```cservice "worker.js"``` if
  the ```.js``` extension is detected.
* `accessKey` - A secret key that must be specified if you wish to invoke commands from outside
  your process. Allows CLI & REST interfaces.
* `config` - A filename to the configuration to load. Useful to keep options from having to be inline.
  This option is automatically set if run via command-line ```cservice "config.json"``` if
  the ```.json``` extension is detected.
* `host` (default: "localhost") - Host to bind to for REST interface. (Will only bind if `accessKey`
  is provided)
* `port` (default: 11987) - Port to bind to. If you leverage more than one cluster-service on a
  machine, you'll want to assign unique ports. (Will only bind if accessKey is provided)
* `workerCount` (default: os.cpus().length) - Gives you control over the number of processes to
  run the same worker concurrently. Recommended to be 2 or more to improve availability. But some
  workers do not impact availability, such as task queues, and can be run as a single instance.
* `cli` (default: true) - Enable the command line interface. Can be disabled for background
  services, or test cases. Running `cserviced` will automatically disable the CLI.
* `ssl` - If provided, will bind using HTTPS by passing this object as the
  [TLS options](http://nodejs.org/api/tls.html#tls_tls_createserver_options_secureconnectionlistener).
* `run` - Ability to run a command, output result, and exit. This option is automatically
  set if run via command-line ```cservice "restart all"``` and no extension is detected.
* `json` (default: false) - If specified in conjunction with ```run```,
  will *only* output the result in JSON for
  consumption from other tasks/services. No other data will be output.
* `silent` (default: false) - If true, forked workers will not send their output to parent's stdio.
* `allowHttpGet` (default: false) - For development purposes, can be enabled for testing, but is
  not recommended otherwise.
* `restartOnMemUsage` (default: disabled) - If a worker process exceeds the specified memory threshold
  (in bytes), the process will be restarted gracefully. Only one worker will be restarted at a time.
* `restartOnUpTime` (default: disabled) - If a worker process exceeds the specified uptime threshold
  (in seconds), the process will be restarted gracefully. Only one worker will be restarted at a time.
* `restartConcurrencyRatio` (default `0.33`) - The ratio of workers that can be restarted concurrently
  during a restart or upgrade process. This can greatly improve the speed of restarts for applications
  with many concurrent workers and/or slow initializing workers.
* `commands` - A single directory, an array of directories, or a comma-delimited list of directories
  may be provided to auto-register commands found in the provided folders that match the ".js"
  extension. If the module exposes the "id" property, that will be the name of the command,
  otherwise the filename (minus the extension) will be used as the name of the command. If relative
  paths are provided, they will be resolved from process.cwd().
* `master` - An optional module to execute for the master process only, once ```start``` has been completed.
* `proxy` - Optional path to a JSON config file to enable Proxy Support.
* `workerGid` - Group ID to assign to child worker processes (recommended `nobody`).
* `workerUid` - User ID to assign to child worker processes (recommended `nobody`).


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

* `start workerPath [cwd] { [timeout:60000] }` - Gracefully start service, one worker at a time.
* `restart all|pid { [timeout:60000] }` - Gracefully restart service, waiting up to timeout before terminating workers.
* `shutdown all|pid { [timeout:60000] }` - Gracefully shutdown service, waiting up to timeout before terminating workers.
* `exit now` - Forcefully exits the service.
* `help [cmd]` - Get help.
* `upgrade all|pid workerPath { [cwd] [timeout:60000] }` - Gracefully upgrade service, one worker at a time. (continuous deployment support).
* `workers` - Returns list of active worker processes.
* `health` - Returns health of service. Can be overidden by service to expose app-specific data.
* `info` - Returns summary of process & workers.



## Commands & Events

Creating custom, or overriding commands and events is as simple as:

  cservice "server.js" --commands "./commands,../some_more_commands"

Or if you prefer to manually do so via code:

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

* `workerStart (pid, reason)` - Upon exit of any worker process, the process id of the exited worker. Reasons include: "start", "restart", "failure", and "upgrade".
* `workerExit (pid, reason)` - Upon start of any worker process. Reasons include: "start", "restart", "failure", and "upgrade".



## Async Support

While web servers are automatically wired up and do not require async logic (as of v1.0), if
your service requires any other asynchronous initialization code before being ready, this
is how it can be done.

Have the worker inform the master once it is actually ready:

	// worker.js
	require("cluster-service").workerReady(false); // we're NOT ready!
	setTimeout(funtion() {
		// dumb example of async support
		require("cluster-service").workerReady(); // we're ready!
	}, 1000);

Additionally, a worker may optionally perform cleanup tasks prior to exit, via:

	// worker.js
	require("cluster-service").workerReady({
		onWorkerStop: function() {
			// lets clean this place up
			process.exit(); // we're responsible for exiting if we register this cb
		}
	});



## Access Control

Commands may be granted "inproc" (high risk), "local" (low risk), or "remote" (no risk). Setting
access control can be done within the command, like so:

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

## Proxy Support

Proxy mode specifically caters to Web Servers that you want to enable automatic
versioning of your service. Any version requested (via `versionHeader`) that is
not yet loaded will automatically have a worker process spun up with the new
version, and after ready, the proxy will route to that worker.

Every version of your app *must* adhere to the `PROXY_PORT` environment
variable like so:

	require("http").createServer(function(req, res) {
	  res.writeHead(200);
	  res.end("Hello world!");
	}).listen(process.env.PROXY_PORT || 3000 /* port to use when not running in proxy mode */);

### Proxy Options

* `versionPath` (default: same directory as proxy JSON config) - Can override
  to point to a new version folder.
* `defaultVersion` - The version (folder name) that is currently active/live.
  If you do not initially set this option, making a request to the Proxy without
	a `versionHeader` will result in a 404 (Not Found) since there is no active/live
	version.
  Upgrades will automatically update this option to the latest upgraded version.
* `versionHeader` (default: `x-version`) - HTTP Header to use when determining
  non-default version to route to.
* `workerFilename` (default: `worker.js`) - Filename of worker file.
* `bindings` (default: `[{ port: 80, workerCount: 2 }]`) - An array of `Proxy Bindings`.
* `versionPorts` (default: `11000-12000`) - Reserved port range that can be used to
  assign ports to different App versions via `PROXY_PORT`.
* `nonDefaultWorkerCount` (default: 1) - If a version is requested that is not
  a default version, this will be the number of worker processes dedicated to
	that version.
* `nonDefaultWorkerIdleTime` (default: 3600) - The number of seconds of inactivity
  before a non-default version will have its workers shut down.

### Proxy Bindings

Binding options:

* `port` - Proxy port to bind to.
* `workerCount` (default: 2) - Number of worker processes to use for this
  binding. Typically more than 2 is unnecessary for a proxy, and less than 2
	is a potential failure point if a proxy worker ever goes down.
* `tlsOptions` - TLS Options if binding for HTTPS.
  * `key` - Filename that contains the Certificate Key.
	* `cert` - Filename that contains the Certificate.
	* `pem` - Filename that contains the Certificate PEM if applicable.

A full list of TLS Options: https://nodejs.org/api/tls.html#tls_tls_createserver_options_secureconnectionlistener

### Proxy Commands

Work like any other `Cluster Commands`.

* `proxy start configPath` - Start the proxy using the provided JSON config file.
* `proxy stop` - Shutdown the proxy service.
* `proxy version workerVersion workerCount` - Set a given App version to the
  desired number of worker processes. If the version is not already running,
	it will be started. If 2 workers for the version are already running, and you
	request 4, 2 more will be started. If 4 workers for the version are already
	running, and you request 2, 2 will be stopped.
* `proxy promote workerVersion workerCount` - Works identical to the
  `proxy version` command, except this will flag the version as active/live,
	resulting in the Proxy Config file being updated with the new `defaultVersion`.
* `proxy info` - Fetch information about the proxy service.



## Tests & Code Coverage

Download and install:

	git clone https://github.com/godaddy/node-cluster-service.git
	cd node-cluster-service
	npm install

Now test:

	npm test

View code coverage in any browser:

	coverage/lcov-report/index.html


## Change Log

[Change Log](https://github.com/godaddy/node-cluster-service/blob/master/CHANGELOG.md)



## License

[MIT](https://github.com/godaddy/node-cluster-service/blob/master/LICENSE.txt)
