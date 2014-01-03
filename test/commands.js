var cservice = require("../cluster-service");
var assert = require("assert");

cservice.log = function() {
};
if(cservice.isWorker){
  it("WORKER", function(done) {});
} else {
  describe('[Commands]', function() {
    it('Start worker', function(done) {
      assert.equal(
        cservice.workers.length,
        0,
        "0 workers expected, but " + cservice.workers.length + " found"
      );
      cservice.start({ workers: null,
        commands: "./test/commands,./test/commands2"}, function() {
        assert.equal(
          cservice.workers.length,
          0,
          "0 worker expected, but " + cservice.workers.length + " found"
        );
        done();
      });
    });

    it('Command "custom"', function(done) {
      cservice.trigger("custom", function(err, result) {
        assert.ifError(err);
        assert.equal(result, true, "Expect result of true, but got " + result);
        done();
      });
    });

    it('Command "customName"', function(done) {
      cservice.trigger("customName", function(err, result) {
        assert.ifError(err);
        assert.equal(result, true, "Expect result of true, but got " + result);
        done();
      });
    });

    it('Stop workers', function(done) {
      cservice.stop(30000, function() {
        assert.equal(
          cservice.workers.length,
          0,
          "0 workers expected, but " + cservice.workers.length + " found"
        );
        done();
      });
    });
  });
}