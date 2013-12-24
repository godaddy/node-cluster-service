var cmd = require('../lib/commands/version');
var assert = require("assert");

describe('[Version cmd]', function() {
  it('Get version', function(done) {
    var pkg = require("../package.json");
    var evt = {};
    var cb = function(err, data) {
      assert.ifError(err);
      assert.equal(data, pkg.version);
      done();
    };
    cmd(evt, cb);
  });
});