var cservice = require("../cluster-service");
var util = require("util");
var cluster = require("cluster");
var async = require("async");

module.exports = {
  createMessage: createMessage,
  sendMessage: sendMessage,
  isValidMessage: isValidMessage,
  respondToMessage: respondToMessage,
  processMessage: processMessage
};

var waiters = {};
var waiterId = 0;

function isValidMessage(msg) {
  if (!msg || !msg.cservice || !msg.cservice.cmd) {
    return false; // ignore invalid cluster-service messages
  }

  return true;
}

function createMessage(cmd, options) {
  var msg = {
    cservice: util._extend({}, options || {})
  };
  msg.cservice.cmd = cmd;
  return msg;
}

function sendMessage(cmd, options, filter, cb) {
  var msg = createMessage(cmd, options);

  if (cluster.isWorker === true) {
    createWaiter(msg, process, cb);
    // send to master and wait for response
    return cservice.processSafeSend(process, msg);
  }

  var workers = cluster.workers;
  if (typeof filter === "function") {
    // filter as directed
    workers = workers.filter(filter);
  }

  var tasks = [];

  workers.forEach(function(worker) {
    tasks.push(createWaiterTask(msg, worker.process, cb));
  });

  // process worker messages, but callback only once
  async.parallel(tasks, function (err, data) {
    if (typeof cb === "function") {
      cb(err, data);
    }
  });
}

function createWaiter(msg, process, cb) {
  if (typeof cb !== "function") {
    return;
  }

  msg.waiterId = "id" + (++waiterId);
  var waiter = waiters[msg.waiterId] = {
    msg: msg,
    process: process,
    cb: cb
  };

  return waiter;
}

function createWaiterTask(msg, process) {
  return function(asyncCb) {
    var waiter = createWaiter(msg, process, asyncCb);
    cservice.processSafeSend(process, msg);
    if (!waiter) {
      // if no waiter, cb immediately
      asyncCb();
    }
  };
}

function respondToMessage(msg, process, error, response) {
  msg.error = error;
  msg.response = response;
  cservice.processSafeSend(process, msg);
}

function processMessage(msg) {
  var waiter = waiters[msg.waiterId];
  if (!waiter) {
    return false;
  }

  waiter.cb(msg.error, msg.response);

  return true;
}
