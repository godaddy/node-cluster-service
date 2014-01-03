/* jshint camelcase:false */
var cmd = require('../lib/commands/help');
var assert = require("assert");
var cservice = require("../cluster-service");

cservice.log = function() {};
if(cservice.isWorker){
  it("WORKER", function(done) {});
} else {
  describe('[Help cmd]', function() {
    it('Start', function(done) {
      cservice.start(
        {
          workers: null,
          workerCount: 1,
          accessKey: "123",
          cli: false
        },
        function() {
          assert.equal(
            cservice.workers.length,
            0,
            "0 worker expected, but " + cservice.workers.length + " found"
          );
          done();
        }
      );
    });

    it('Help all', function(done) {
      cservice.trigger("help", function(err, data) {
        assert.equal(err, null);
        assert.equal(
          data.more,
          "Commands (Use 'help [command_name]' for more details)"
        );
        assert.ok(data.commands);
        var invisible_commands = data.commands.filter(
          function(el) {
            return (el === "workerStart" || el === "workerExit");
          }
        );
        assert.equal(invisible_commands.length, 0,
          "Expected to find 0 invisible commands, but found " +
          invisible_commands.length
        );
        done();
      });
    });

    it('Help health', function(done) {
      cservice.trigger("help", function(err, data) {
        assert.equal(err, null);
        assert.equal(
          data.info,
          [
            "Returns health of service. May be overidden by service to expose",
            "app-specific data."
          ].join(' ')
        );
        assert.equal(data.command, "health");
        done();
      }, "health");
    });

    it('more', function(done) {
      var callback = function(nullObj, obj) {
        assert.equal(nullObj, null);
        assert.equal(obj.command_name, "Optional if you want extended help");
        assert.equal(obj.command, "help [command_name]");
        done();
      };

      cmd.more(callback);
    });

    it('Stop', function(done) {
      cservice.stop(30000, function() {
        assert.equal(
          cservice.workers.length,
          0,
          "0 workers expected, but " + cservice.workers.length + " found"
        );
        done();
      });
    });
  });
}