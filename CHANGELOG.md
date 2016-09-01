## v2.0.0 - 9/1/2016

### Features:

* High worker restart concurrency to speed up upgrades/restarts via `restartConcurrencyRatio`
* Proxy support with dynamic app versioning
  * Central proxy config file, promotions persisted to disk to survive service restarts
  * Isolated worker processes per version
  * On demand versioning via `x-version` header
  * Version promotion brings up worker count for desired version and brings down worker count of old version
* Worker process downgrade from root via `workerGid` & `workerUid`
* Backward compatibility with `v1.x`! Who does that with a major release?!

### Enhancements:

* Refactored communication between processes
* Worker processes may now trigger commands (same) and wait for response (new).
  The new message bus enables RPC and other flows like this between processes

### Fixes:

* Worker process.send crash


## v1.0.0 - 5/8/2014

### Features:

* #56. Ability to restart web server gracefully under load with no code
* No code required to enable net statistics

### Fixes:

* Prevent additional commands in CLI while in progress to resolve state issues
* Handle failed `start` command gracefully
* Handle failed `upgrade` command gracefully
* Fixed `start` command from preventing failed workers to auto-restart
* Fixed `restart` command from preventing failed workers to auto-restart
* Further streamlined management of state across multiple cservice instances
* Allow numeric accessKey's
* Fix crash if no command provided in REST call
* #57. Cannot use '--run' and '--config' together
* #58. Custom events from master & workers



## v0.10.0 - 5/2/2014

### Legacy:

* Dropped support for 'ready' flag, was causing support/complexity issues

### Features:

* Ability to start without worker
* Ability to support multiple versions of cservice through shared state
* Added example workers to `examples/`



## v0.9.0 - 2/17/2014

### Features:

* #51. Lockdown "help" command to "local" by default
* #49. Support for multiple keys within 'accessKey' option. (Undocumented,experimental)
* #54. Allow REST command to originate from body

### Fixes:

* #46. Expect API response even on "shutdown" or "exit"
* #52. processDetails not returned during message floods
* #53. Net Statistics doesn't work if using multiple instances of cservice



## v0.8.0 - 1/13/2014

### Features:

* #40. Net statistics support



## v0.7.0 - 1/3/2014

### Features:

* #39. Support for hidden(internal) commands
* #38. Option 'commands' support
* #37. Disable cli by default, unless run from command-line
* #30. Smarter async workerReady logic
