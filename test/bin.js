var assert = require("assert");
var fs = require("fs");

describe('[Bin]', function(){
  it("bin/cservice", function(done) {
    fs.readFile("./bin/cservice", { encoding: "utf8" }, function(err, data) {
      assert.ifError(err);
      assert.equal(/\r/.test(data), false, "\r not permitted in bin files");
      done();
    });
  });

  it("bin/cserviced", function(done) {
    fs.readFile("./bin/cserviced", { encoding: "utf8" }, function(err, data) {
      assert.ifError(err);
      assert.equal(/\r/.test(data), false, "\r not permitted in bin files");
      done();
    });
  });
});