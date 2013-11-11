var cservice = require("../cluster-service");
var workers = require('../lib/commands/workers');
var assert = require("assert");

cservice.options.log = function() {};
cservice.isWorker && it("WORKER", function(done) { });
cservice.isMaster && describe('Workers cmd', function(){
	it('Start', function(done){
		cservice.start(null,  { workerCount: 1, accessKey: "123", cliEnabled: false }, function() {
			assert.equal(cservice.workers.length, 0, "0 worker expected, but " + cservice.workers.length + " found");
			done();
		});
	});

	it('Test workers command', function(done){
		cservice.trigger("workers",  function(err, data) {
			assert.equal(err, null);
			assert.equal(data.workers.length, 0);
			done();
		});
	});  
	
	it('more', function(done){
    	var callback = function(nullObj, obj){
    		assert.equal(nullObj, null);
    		assert.equal(obj.info, "Returns list of active worker processes.");
    		assert.equal(obj.command, "workers");
    		done();
    	};

    	workers.more(callback);
	});

	it('Stop', function(done){
		cservice.stop(30000, function() {
			assert.equal(cservice.workers.length, 0, "0 workers expected, but " + cservice.workers.length + " found");
			done();
		});
	});  
})
