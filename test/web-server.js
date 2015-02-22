var cservice = require("../cluster-service");
var assert = require("assert");
var request = require("request");

cservice.log = function() {};

if(cservice.isWorker){
  it("WORKER", function(done) {});
} else {
  describe('[web-server]', function() {
    var url = "http://localhost:9817";
    
    it('Start workers', function(done) {
      assert.equal(
        cservice.workers.length,
        0,
        "0 workers expected, but " + cservice.workers.length + " found"
      );
      cservice.start(
        {
          workers: {
            webServer: {
              worker: "./test/workers/web-server-slow",
              count: 2
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

    it('Verify web server available', function(done) {
      request.post(url, function(err, res, result) {
        assert.equal(
          result,
          "Hello World"
        );
        done();
      });
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

    it('Verify web server available', function(done) {
      request.post(url, function(err, res, result) {
        assert.equal(
          result,
          "Hello World"
        );
        done();
      });
    });

    it('Graceful restart under load', function(done) {
      var requestCount = 0;
      // trigger all requests
      while (requestCount < 500) {
        requestCount++;
        /* jshint ignore:start */
        request.post(url, function(err, res, result) {
          requestCount--;
          assert.equal(
            result,
            "Hello World"
          );
        });
        /* jshint ignore:end */
      }
      setImmediate(function() {
        cservice.trigger("restart", function() {
          assert.equal(
            cservice.workers.length,
            2,
            "2 workers expected, but " + cservice.workers.length + " found"
          );
          
          var timer = setInterval(function() {
            // check back frequently to see if all requests have responded
            if (requestCount === 0) {
              clearInterval(timer);
              done();
            }
          }, 50);
        }, "all", {timeout: 30000} // with timeout
        );

        // trigger some MORE requests
        while (requestCount < 1000) {
          requestCount++;
          /* jshint ignore:start */
          request.post(url, function(err, res, result) {
            requestCount--;
            assert.equal(
              result,
              "Hello World"
            );
          });
          /* jshint ignore:end */
        }
      });
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

    it('Verify web server NOT available', function(done) {
      request.post(url, function(err, res, result) {
        assert.equal(
          err.code,
          "ECONNREFUSED"
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