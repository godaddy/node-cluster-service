var cservice = require("../cluster-service");
var assert = require("assert");

describe('Start & Stop', function(){
	describe('Start worker', function(){
		it('1 worker should be running', function(done){
			cservice.start("./test/workers/basic",  { workerCount: 1, accessKey: "123", cliEnabled: false }, function() {
				assert.equal(cservice.workers.length, 1, "1 worker expected, but " + cservice.workers.length + " found");
				done();
			});
		});  
	});
	
	describe('Add 2nd worker', function(){  
		it('2 workers should be running', function(done){
			cservice.trigger("start", function() {
				assert.equal(cservice.workers.length, 2, "2 workers expected, but " + cservice.workers.length + " found");
				done();
			}, "./test/workers/basic2"
			);
		});  
	});
	
	describe('Restart workers', function(){  
		it('2 workers should be running', function(done){
			cservice.trigger("restart", function() {
				assert.equal(cservice.workers.length, 2, "2 workers expected, but " + cservice.workers.length + " found");
				done();
			}, "all"
			);
		});  
	});
	
	describe('Upgrade workers', function(){  
		it('2 workers should be running', function(done){
			cservice.trigger("upgrade", function() {
				assert.equal(cservice.workers.length, 2, "2 workers expected, but " + cservice.workers.length + " found");
				done();
			}, "all", "./test/workers/basic2"
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
})
