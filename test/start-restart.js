var cservice = require("../cluster-service");
var assert = require("assert");

cservice.log = function() {};
cservice.isWorker && it("WORKER", function(done) { });
cservice.isMaster && describe('Restart', function(){
	describe('Start workers', function(){
		it('2 worker should be running', function(done){
			cservice.start("./test/workers/basic",  { workerCount: 2, accessKey: "123", cliEnabled: false, workerReady: true }, function() {
				assert.equal(cservice.workers.length, 2, "2 workers expected, but " + cservice.workers.length + " found");
				done();
			});
		});  
	});

	describe('Bad input #1', function(){  
		it('Bad input command', function(done){
			cservice.trigger("restart", function(err) {
				assert.equal(err, "Invalid request. Try help restart");
				done();
			}, "GG"
			);
		});
	});

	describe('Bad input #2', function(){  
		it('Bad input type', function(done){
			cservice.trigger("restart", function(err) {
				assert.equal(err, "Invalid request. Try help restart");
				done();
			}, 0
			);
		});
	});

	describe('Restart workers', function(){  
		it('2 workers should be running', function(done){
			cservice.trigger("restart", function() {
				assert.equal(cservice.workers.length, 2, "2 workers expected, but " + cservice.workers.length + " found");
				done();
			}, "all", 30000 /* with timeout */
			);
		});  
		it('timeout', function(done){
			cservice.trigger("restart", function(err) {
				assert.equal(err, "timed out");
				done();
			}, "all", 100 /* with timeout */
			);
		});
	});
	
	describe('Stop workers', function(){  
		it('0 workers should be running', function(done){
			cservice.stop(30000, function() {
				assert.equal(cservice.workers.length, 0, "0 workers expected, but " + cservice.workers.length + " found");
				done();
			});
		});  
	});
	
	describe('Restart with no workers', function(){  
		it('Expect restart failure', function(done){
			cservice.trigger("restart", function(err) {
				assert.equal(err, "No workers to restart");
				done();
			}, "all"
			);
		});
	});
})
