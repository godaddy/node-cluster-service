var cservice = require("../cluster-service");
var assert = require("assert");
var path = require("path");

if(cservice.isWorker){
  it("WORKER", function(done) {});
} else {
  describe('[master option]', function(){
    var masterFn = path.resolve("./test/workers/master.js");
	
    // clear cache, just in case
    delete require.cache[masterFn];
  
    it("Run", function(done) {
      cservice.start(
        {
          workers: "./test/workers/basic.js",
          workerCount: 1,
          accessKey: "123",
          cli: false,
          master: "./test/workers/master.js"
        },
        function() {
          assert.equal(
            cservice.workers.length,
            1,
            "1 worker expected, but " + cservice.workers.length + " found"
          );
          assert.equal(
            masterFn in require.cache,
            true,
            "Master was not run by cservice.start"
          );
          done();
        }
      );
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
