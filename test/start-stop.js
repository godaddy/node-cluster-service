var cservice = require("../cluster-service");
var assert = require("assert");

cservice.options.log = function() {};
cservice.isWorker && it("WORKER", function(done) { });
cservice.isMaster && describe('Start & Stop', function(){
	it('Start worker', function(done){
		cservice.start("./test/workers/basic",  { workerCount: 1, accessKey: "123", cliEnabled: false }, function() {
			assert.equal(cservice.workers.length, 1, "1 worker expected, but " + cservice.workers.length + " found");
			done();
		});
	});  

	it('Add 2nd worker', function(done){
		cservice.start("./test/workers/basic",  { workerCount: 1, accessKey: "123", cliEnabled: false }, function() {
			assert.equal(cservice.workers.length, 2, "2 workers expected, but " + cservice.workers.length + " found");
			done();
		});
	});
	
	it('Restart workers', function(done){
		cservice.trigger("restart", function() {
			assert.equal(cservice.workers.length, 2, "2 workers expected, but " + cservice.workers.length + " found");
			done();
		}, "all"
		);
	});
	
	it('Upgrade workers', function(done){
		cservice.trigger("upgrade", function() {
			assert.equal(cservice.workers.length, 2, "2 workers expected, but " + cservice.workers.length + " found");
			done();
		}, "all", "./test/workers/basic2"
		);
	});

	it('Stop workers', function(done){
		cservice.stop(30000, function() {
			assert.equal(cservice.workers.length, 0, "0 workers expected, but " + cservice.workers.length + " found");
			done();
		});
	});

	it('Stop an already stopped service', function(done){
		cservice.stop(30000, function() {
			assert.equal(cservice.workers.length, 0, "0 workers expected, but " + cservice.workers.length + " found");
			done();
		});
	});
})
