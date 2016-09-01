var cservice = require("../cluster-service");
var assert = require("assert");
var start = require("../lib/start");

cservice.log = function() {
};
if(cservice.isWorker){
  it("WORKER", function(done) {});
} else {
  describe('[Start & Stop]', function() {
    it('Start worker', function(done) {
      assert.equal(
        cservice.workers.length,
        0,
        "0 workers expected, but " + cservice.workers.length + " found"
      );
      cservice.start({config: "./test/workers/basic.json"}, function() {
        assert.equal(
          cservice.workers.length,
          1,
          "1 worker expected, but " + cservice.workers.length + " found"
        );
        done();
      });
    });

    it("start.prepArgs.js", function(done) {
      var o = {_: ["Server.JS"]};
      start.prepArgs(o);
      assert.equal(
        o.workers,
        "Server.JS", "Expected 'Server.JS', got " + o.workers
      );
      done();
    });

    it("start.prepArgs.json", function(done) {
      var o = {_: ["Config.JSon"]};
      start.prepArgs(o);
      assert.equal(
        o.config,
        "Config.JSon", "Expected 'Config.JSon', got " + o.config
      );
      done();
    });

    it("start.prepArgs.run", function(done) {
      var o = {_: ["some command"]};
      start.prepArgs(o);
      assert.equal(
        o.run,
        "some command", "Expected 'some command', got "+o.run
      );
      assert.ifError(o.json);
      done();
    });

    it("start.prepArgs.run.json", function(done) {
      var o = {_: ["some command"], json: true};
      start.prepArgs(o);
      assert.equal(
        o.run,
        "some command", "Expected 'some command', got "+o.run
      );
      assert.equal(o.cli, false, "CLI should be disabled");
      done();
    });

    it('Add 2nd worker', function(done) {
      cservice.trigger("start", function(err, result) {
        assert.equal(
          cservice.workers.length,
          2,
          "2 workers expected, but " + cservice.workers.length + " found"
        );
        done();
      }, "./test/workers/basic", {count: 1, timeout: 10000});
    });

    it('Timeout on new worker', function(done) {
      cservice.trigger("start", function(err, result) {
        assert.equal(err, "timed out");
        done();
      }, "./test/workers/longInit", {count: 1, timeout: 100});
    });

    it('Start help', function(done) {
      cservice.trigger("help", function(err, result) {
        assert.equal(
          result.info,
          "Gracefully start service, one worker at a time."
        );
        done();
      }, "start");
    });

    it('Bad worker start', function(done) {
      cservice.trigger("start", function(err, result) {
        assert.equal(err, "Invalid request. Try help start");
        done();
      }, null, {count: 1, timeout: 1000});
    });

    it('Restart workers', function(done) {
      cservice.trigger("restart", function() {
        assert.equal(
          cservice.workers.length,
          2,
          "2 workers expected, but " + cservice.workers.length + " found"
        );
        done();
      }, "all"
        );
    });

    it('Upgrade workers', function(done) {
      cservice.trigger("upgrade", function() {
        assert.equal(
          cservice.workers.length,
          2,
          "2 workers expected, but " + cservice.workers.length + " found"
        );
        done();
      }, "all", "./test/workers/basic2"
      );
    });

    it('Stop workers after upgrade', function(done) {
      cservice.stop(30000, function(err, msg) {
        assert.ok(!err, 'Received error ' + err);
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

    it('Stop an already stopped service', function(done) {
      cservice.stop(30000, function() {
        assert.equal(
          cservice.workers.length,
          0,
          "0 workers expected, but " + cservice.workers.length + " found"
        );
        done();
      });
    });

    it('Start inline async worker', function(done) {
      var startTime = new Date().getTime();
      cservice.start(
        {
          workers:
          {
            inlineReady: {
              worker: "./test/workers/inlineReady.js",
              count: 1
            }
          }
        },
        function() {
          assert.equal(
            cservice.workers.length,
            1,
            "1 workers expected, but " + cservice.workers.length + " found"
          );
          var diffTime = (new Date().getTime() - startTime);
          assert.ok(diffTime >= 1000,
            "Inline workerReady logic should have taken >= 1000ms, " +
            "but returned in " + diffTime + "ms"
          );
          done();
        }
      );
    });

    it('Stop workers', function(done) {
      cservice.stop(30000, function(err, msg) {
        assert.ok(!err, 'Received error ' + err);
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
  });
}
