var exit = require('../lib/exit');

module.exports = {
    setUp: function (callback) {
        this._log = console.log;
        callback();
    },
    tearDown: function (callback) {
        console.log = this._log;
        callback();
    },
    "Now cmd not issued": function(test){
        test.expect(1);
        var evt = {};
        var cmd = "Not now";
        var cb = function(message){
            test.equal(message, "Invalid request, 'now' required. Try help exit");
            test.done();
        };
        exit(evt, cb, cmd);
    },
    "Calls process exit": function(test){
        test.expect(5);
        var evt = {};
        var cmd = "now";
        process.exit = function(input){
            test.equal(input, 0);
        };
        console.log = function(msg1, msg2){
            test.equal(msg1, "*** FORCEFUL TERMINATION REQUESTED ***");
            test.equal(msg2, "Exiting now.");
        };
        var cb = function(nullObj, message){
            test.equal(nullObj, null);
            test.equal(message, "Exiting now.");
            test.done();
        };
        exit(evt, cb, cmd);
    },
    "more": function(test){
    	test.expect(4);
    	var callback = function(nullObj, obj){
    		test.equal(nullObj, null);
    		test.equal(obj.info, "Forcefully exits the service.");
    		test.equal(obj.command, "exit now");
    		test.equal(obj["now"], "Required. 'now' to force exit.");
    		test.done();
    	};

    	exit.more(callback);
    }
};