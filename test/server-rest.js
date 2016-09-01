var cservice = require("../cluster-service");
var assert = require("assert");
var httpclient = require("../lib/http-client");
var util = require("util");
var request = require("request");

cservice.log = function() {};
cservice.results = function() {};

if(cservice.isWorker){
  it("WORKER", function(done) {});
} else {
  describe('[REST Server]', function() {
    it('Start worker', function(done) {
      cservice.start(
        {
          workers: null,
          workerCount: 0,
          accessKey: "123",
          cli: false
        },
        function() {
          assert.equal(
            cservice.workers.length,
            0,
            "0 worker expected, but " + cservice.workers.length + " found"
          );
          done();
        }
      );
    });

    httpclient.init(
      util._extend(cservice.options, {accessKey: "123", silentMode: true})
    );
    it('Health check', function(done) {
      httpclient.execute("health", function(err, result) {
        assert.equal(
          result, "\"OK\"", "Expected OK. result=" + result + ", err=" + err
        );
        done();
      }
      );
    });

    it('Bad command', function(done) {
      httpclient.execute("x98s7df987sdf", function(err, result) {
        assert.equal(
          err,
          "Not found. Try /help", "Expected 'Not found. Try /help'. result="
            + result
            + ", err=" + err
        );
        done();
      }
      );
    });

    var disabledCmd = function(evt, cb) {
      cb(null, "You shouldn't be able to see my data");
    };
    disabledCmd.control = function() {
      return "disabled";
    };

    it('Run cmd', function(done) {
      cservice.start({run: "health"}, function(err, result) {
        assert.ifError(err);
        assert.equal(result, "\"OK\"", "Expected OK, but received: " + result);
        done();
        return false;
      });
    });

    it('Command authorization', function(done) {
      cservice.on("disabledCmd", disabledCmd);
      var url = "http://localhost:11987/cli?cmd=disabledCmd&accessKey=123";
      request.post(url, function(err, res, result) {
        assert.equal(
          result,
          "Not authorized to execute 'disabledCmd' remotely"
        );
        done();
      });
    });

    it('Request authorization', function(done) {
      cservice.on("disabledCmd", disabledCmd);
      var url = "http://localhost:11987/cli?cmd=disabledCmd&accessKey=BAD";
      request.post(url, function(err, res, result) {
        assert.equal(result, "Not authorized");
        done();
      });
    });

    it('Method Not Allowed', function(done) {
      var url = "http://localhost:11987/cli?cmd=health&accessKey=123";
      request.get(url, function(err, res, result) {
        assert.equal(
          result,
          "Method Not Allowed", "Expected 'Method Not Allowed'. result="
            + result
            + ", err=" + err
        );
        done();
      });
    });

    it('Page Not Found', function(done) {
      var url = "http://localhost:11987/BADCLI?cmd=health&accessKey=123";
      request.post(url, function(err, res, result) {
        assert.equal(
          result,
          "Page Not Found", "Expected 'Page Not Found'. result="
            + result
            + ", err=" + err
          );
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