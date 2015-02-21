var cservice = require("../cluster-service");
var assert = require("assert");

cservice.log = function() {};

if(cservice.isWorker){
  it("WORKER", function(done) {});
} else {
  describe('[Restart]', function() {
    it('Start workers', function(done) {
      assert.equal(
        cservice.workers.length,
        0,
        "0 workers expected, but " + cservice.workers.length + " found"
      );
      cservice.start(
        {
          workers: {
            basic2: {
              worker: "./test/workers/basic2",
              count: 2,
              ready: false
            }
          },
          accessKey: "123",
          cli: false
        },
        function() {
          assert.equal(
            cservice.workers.length,
            2,
            "2 workers expected, but " + cservice.workers.length + " found"
          );
          done();
        }
      );
    });

    it('Bad input #1', function(done) {
      cservice.trigger("restart", function(err) {
        assert.equal(err, "Invalid request. Try help restart");
        done();
      }, "GG"
        );
    });

    it('Bad input #2', function(done) {
      cservice.trigger("restart", function(err) {
        assert.equal(err, "Invalid request. Try help restart");
        done();
      }, 0
        );
    });

    it('Restart without timeout', function(done) {
      cservice.trigger("restart", function() {
        assert.equal(
          cservice.workers.length,
          2,
          "2 workers expected, but " + cservice.workers.length + " found"
        );
        done();
      }, "all", {timeout: 30000} // with timeout
      );
    });

    it('Restart with timeout', function(done) {
      cservice.trigger("restart", function(err) {
        assert.equal(err, "timed out");
        setTimeout(function() {
          assert.equal(
            cservice.workers.length,
            2,
            "2 workers expected, but " + cservice.workers.length + " found"
          );
          done();
        }, 1000);
      }, "all", {timeout: 1} // with timeout
      );
    });

    it('Stop workers', function(done) {
      cservice.stop(30000, function(err, msg) {
        assert.ok(!err, 'Error: ' + err);
        assert.equal(
          cservice.workers.length,
          0,
          "0 workers expected, but "
          + cservice.workers.length
          + " found. Message: " + msg
        );
        done();
      });
    });

    it('Restart with no workers', function(done) {
      cservice.trigger("restart", function(err) {
        assert.equal(err, "No workers to restart");
        assert.equal(
          cservice.workers.length,
          0,
          "0 workers expected, but " + cservice.workers.length + " found"
        );
        done();
      }, "all");
    });
  });
}