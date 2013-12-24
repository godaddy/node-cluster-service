var cmd = require('../lib/commands/health');
var assert = require("assert");

describe('[Health cmd]', function() {
  it('Issue command', function(done) {
    cmd({}, function(nullObj, data) {
      assert.equal(nullObj, null);
      assert.equal(data, "OK");
      done();
    });
  });

  it('more', function(done) {
    var callback = function(nullObj, data) {
      assert.equal(nullObj, null);
      assert.equal(
        data.info,
        [
          "Returns health of service. May be overidden by service to expose",
          "app-specific data."
        ].join(' ')
      );
      assert.equal(data.command, "health");
      done();
    };

    cmd.more(callback);
  });
});