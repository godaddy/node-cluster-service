var workers = require('../lib/workers');
var assert = require("assert");

describe('Workers cmd', function(){
	it('more', function(done){
    	var callback = function(nullObj, obj){
    		assert.equal(nullObj, null);
    		assert.equal(obj.info, "Returns list of active worker processes.");
    		assert.equal(obj.command, "workers");
    		done();
    	};

    	workers.more(callback);
	});  
})
