var cservice = require("../cluster-service");
var assert = require("assert");

describe('Proxy version validation', function() {
  var valid = ["v1", "1.2.3", "release_2023-01-06", "_beta", "A"];
  var invalid = [
    undefined, null, 123, "", ".", "..", "../v1", "..\\v1", "v1/../../etc",
    "/etc/passwd", "v1/worker", "__proto__", "constructor", "hasOwnProperty",
    "toString", "v 1", "v1\n", new Array(130).join("a") + "aaa"
  ];

  valid.forEach(function(v) {
    it('accepts folder name ' + JSON.stringify(v), function() {
      assert.equal(cservice.proxy.isValidVersion(v), true);
    });
  });

  invalid.forEach(function(v) {
    it('rejects ' + JSON.stringify(v), function() {
      assert.equal(cservice.proxy.isValidVersion(v), false);
    });
  });
});
