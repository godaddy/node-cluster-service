var cservice = require("../cluster-service");
var assert = require("assert");

cservice.log = function() {};
cservice.isWorker && it("WORKER", function(done) { });
cservice.isMaster && describe('[Start & Stop]', function(){
	it('Start worker', function(done){
		assert.equal(cservice.workers.length, 0, "0 workers expected, but " + cservice.workers.length + " found");
		cservice.start({ workers: { basic: { worker: "./test/workers/basic", count: 1 } }, accessKey: "123", cli: false }, function() {
			assert.equal(cservice.workers.length, 1, "1 worker expected, but " + cservice.workers.length + " found");
			done();
		});
	});  

	it('Add 2nd worker', function(done){
		cservice.trigger("start", function(err, result) {
			assert.equal(cservice.workers.length, 2, "2 workers expected, but " + cservice.workers.length + " found");
			done();
		}, "./test/workers/basic", { ready: false, count: 1, timeout: 10000 });
	});

	it('Timeout on new worker', function(done){
		cservice.trigger("start", function(err, result) {
			assert.equal(err, "timed out");
			done();
		}, "./test/workers/longInit", { ready: false, count: 1, timeout: 1000 });
	});

	it('Start help', function(done){
		cservice.trigger("help", function(err, result) {
			assert.equal(result.info, "Gracefully start service, one worker at a time.");
			done();
		}, "start");
	});
	
	it('Bad worker start', function(done){
		cservice.trigger("start", function(err, result) {			
			assert.equal(err, "Invalid request. Try help start");
			done();
		}, null, { count: 1, timeout: 1000 });
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
		}, "all", "./test/workers/basic2", { ready: false }
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
