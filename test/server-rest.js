var cservice = require("../cluster-service");
var assert = require("assert");
var httpclient = require("../lib/http-client");
var extend = require("extend");
var request = require("request");

describe('REST Server', function(){
	describe('Start worker', function(){
		it('0 workers should be running', function(done){
			cservice.start(null,  { workerCount: 0, accessKey: "123", cliEnabled: false }, function() {
				assert.equal(cservice.workers.length, 0, "0 worker expected, but " + cservice.workers.length + " found");
				done();
			});
		});  
	});
	
	describe('Health check', function(){
		httpclient.init(cservice.locals, extend(cservice.options, { accessKey: "123", silentMode: true }));
		it('OK should be returned', function(done){
			httpclient.execute("health", function(err, result) {
				assert.equal(result, "'OK'", "Expected OK. result=" + result + ", err=" + err);
				done();
			}
			);
		});
	});

	describe('Bad command', function(){
		it('Should fail', function(done){
			httpclient.execute("x98s7df987sdf", function(err, result) {
				assert.equal(result, "Not found. Try /help", "Expected 'Not found. Try /help'. result=" + result + ", err=" + err);
				done();
			}
			);
		});  
	});

	describe('Method Not Allowed', function(){
		it('405', function(done){
			var url = "http://localhost:11987/cli?cmd=health&accessKey=123";
			request.get(url, function (err, res, result) {
				assert.equal(result, "Method Not Allowed", "Expected 'Method Not Allowed'. result=" + result + ", err=" + err);
				done();
			});		
		});  
	});

	describe('Page Not Found', function(){
		it('404', function(done){
			var url = "http://localhost:11987/BADCLI?cmd=health&accessKey=123";
			request.post(url, function (err, res, result) {
				assert.equal(result, "Page Not Found", "Expected 'Page Not Found'. result=" + result + ", err=" + err);
				done();
			});		
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
