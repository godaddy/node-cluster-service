var assert = require("assert");
var util = require("../lib/util");

describe('Util funcs', function() {
  describe('getArgsFromQuestion', function() {
    it('Strings', function(done) {
      var args = util.getArgsFromQuestion(
        "health { \"check\": true, \"nested\": { } } \"arg #3\" [\"arg #4\"]",
        " "
      );
      assert.equal(args.length, 4);
      assert.equal(args[1].check, true);
      done();
    });
  });
});