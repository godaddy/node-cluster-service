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

describe('Util safeEqual', function() {
  it('matches equal strings', function() {
    assert.equal(util.safeEqual("lksjdf982734", "lksjdf982734"), true);
  });
  it('rejects different strings of equal length', function() {
    assert.equal(util.safeEqual("abc", "abd"), false);
  });
  it('rejects different lengths', function() {
    assert.equal(util.safeEqual("abc", "abcd"), false);
  });
  it('rejects non-string input (repeated query params)', function() {
    assert.equal(util.safeEqual(["123"], "123"), false);
    assert.equal(util.safeEqual(undefined, undefined), false);
    assert.equal(util.safeEqual("123", undefined), false);
    assert.equal(util.safeEqual(123, 123), false);
  });
  it('rejects empty strings', function() {
    assert.equal(util.safeEqual("", ""), false);
    assert.equal(util.safeEqual("", "abc"), false);
  });
});
