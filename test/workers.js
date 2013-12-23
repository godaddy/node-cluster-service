var cservice = require("../cluster-service");
var assert = require("assert");
var sinon = require("sinon");
var stats = {
  onWorkerReady: 0,
  onWorkerStop: 0
};
var workerStopped = 0;
var workerReady = require("../lib/worker-ready");

cservice.log = function() {};
if(cservice.isWorker){
  it("WORKER", function(done) {});
} else {
  describe('[Works]', function() {
    before(function(done) {
      process.send = fakeSend;

      done();
    });

    after(function() {
      delete process.send;
    });

    it('workerReady.isWorker', function(done) {
      workerReady({onWorkerStop: onWorkerStop}, true);
      assert.equal(
        stats.onWorkerReady,
        1,
        "1 onWorkerReady expected, but " + stats.onWorkerReady + " detected"
      );
      workerReady({onWorkerStop: onWorkerStop}, true);
      assert.equal(
        stats.onWorkerReady,
        1,
        "1 onWorkerReady expected, but " + stats.onWorkerReady + " detected"
      );
      done();
    });

    it('workerReady.ifMaster', function(done) {
      workerReady({onWorkerStop: onWorkerStop});
      assert.equal(
        stats.onWorkerReady,
        1,
        "1 onWorkerReady expected, but " + stats.onWorkerReady + " detected"
      );
      done();
    });

    it('onWorkerStop', function(done) {
      process.emit("message", {cservice: {cmd: 'onWorkerStop'}});
      assert.equal(
        stats.onWorkerStop,
        1,
        "1 onWorkerStop expected, but " + stats.onWorkerStop + " detected"
      );
      done();
    });

    it('BAD onWorkerStop', function(done) {
      process.emit("message", {cservice: {}});
      assert.equal(
        stats.onWorkerStop,
        1,
        "1 onWorkerStop expected, but " + stats.onWorkerStop + " detected"
      );
      done();
    });

    describe("#send", function(){
      var original;

      beforeEach(function(){
        original = [];
        cservice.workers.map(function(worker){
          var stub = sinon.stub();
          original.push(worker);
          stub.pid = worker.pid;
          return stub;
        });
      });

      afterEach(function(){
        cservice.workers.map(original.shift);
      });

      it("sends the message to all workers", function() {
        var workersCalled = 0;
        //act
        cservice.workers.send({boo:true});
        //assert
        cservice.workers.map(function(stub){
          sinon.calledWith(stub, sinon.match({boo:true}));
          workersCalled+=1;
        });

        assert.equal(workersCalled, original.length);
      });
    });
  });
}

function fakeSend(o) {
  stats.onWorkerReady++;
}

function onWorkerStop() {
  stats.onWorkerStop++;
}