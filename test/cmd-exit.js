var exit = require('../lib/commands/exit');
var assert = require("assert");

describe('[Exit cmd]', function() {
  it('Invalid request if cmd not equal to now', function(done) {
    var evt = {};
    var cmd = "Not now";
    var cb = function(message) {
      assert.equal(message, "Invalid request, 'now' required. Try help exit");
      done();
    };
    exit(evt, cb, cmd);
  });

  it('Calls process exit', function(done) {
    var evt = {};
    var cmd = "now";
    process.exit = function(input) {
      assert.equal(input, 0);
    };
    var realLog = console.log;
    console.log = function(msg1, msg2) {
      assert.equal(msg1, "*** FORCEFUL TERMINATION REQUESTED ***");
      assert.equal(msg2, "Exiting now.");
    };
    var cb = function(nullObj, message) {
      assert.equal(nullObj, null);
      assert.equal(message, "Exiting now.");
      console.log = realLog;
      done();
    };
    exit(evt, cb, cmd);
  });

  it('more', function(done) {
    var callback = function(nullObj, obj) {
      assert.equal(nullObj, null);
      assert.equal(obj.info, "Forcefully exits the service.");
      assert.equal(obj.command, "exit now");
      assert.equal(obj.now, "Required. 'now' to force exit.");
      done();
    };

    exit.more(callback);
  });
});
