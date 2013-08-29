var cmd = require('../lib/help');
var assert = require("assert");

describe('Help cmd', function(){
	it('more', function(done){
    	var callback = function(nullObj, obj){
    		assert.equal(nullObj, null);
    		assert.equal(obj.command_name, "Optional if you want extended help");
    		assert.equal(obj.command, "help [command_name]");
    		done();
    	};

    	cmd.more(callback);
	});  
})
