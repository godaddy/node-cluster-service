var cmd = require('../lib/health');
var assert = require("assert");

describe('Health cmd', function(){
	it('Issue command', function(done){
        cmd({}, function(nullObj, data){
            assert.equal(nullObj, null);
            assert.equal(data, "OK");
            done();
        });
	});
	
	it('more', function(done){
    	var callback = function(nullObj, obj){
    		assert.equal(nullObj, null);
    		assert.equal(obj.info, "Returns health of service. May be overidden by service to expose app-specific data.");
    		assert.equal(obj.command, "health");
    		done();
    	};

    	cmd.more(callback);
	});  
})
