var cservice = require("../cluster-service");

/*
 * question - Question to split apart.
 Ex: prop1 "prop #2" { "prop": 3 } [ "prop #4" ] 5
 * delimiter - What splits the properties? Can be one or more characters.
 * return - An array of arguments.
 Ex: [ "prop1", "prop #2", { "prop": 3 }, [ "prop #4" ], 5 ]
 */
exports.getArgsFromQuestion = getArgsFromQuestion;
exports.debug = debug;
exports.log = log;
exports.error = error;
exports.results = results;
exports.processSafeSend = processSafeSend;

function debug() {
  var args;
  var i;
  if (cservice.options.cli === true && cservice.options.debug) {
    if(process.stdout.clearLine){
      process.stdout.clearLine();
    }
    if(process.stdout.cursorTo){
      process.stdout.cursorTo(0);
    }

    args = Array.prototype.slice.call(arguments);
    for (i = 0; i < args.length; i++) {
      if (typeof args[i] === "string") {
        args[i] = args[i].debug;
      }
    }
    if (args.length > 0 && typeof args[0] === "string" && args[0][0] === "{") {
      cservice.options.debug("cservice:".cservice);
    } else {
      args = ["cservice: ".cservice].concat(args);
    }
    cservice.options.debug.apply(this, args);
  }
}

function log() {
  var args;
  if (cservice.options.cli === true && cservice.options.log) {
    if(process.stdout.clearLine){
      process.stdout.clearLine();
    }
    if(process.stdout.cursorTo){
      process.stdout.cursorTo(0);
    }

    args = Array.prototype.slice.call(arguments);
    if (args.length > 0 && typeof args[0] === "string" && args[0][0] === "{") {
      cservice.options.log("cservice:".cservice);
    } else {
      args = ["cservice: ".cservice].concat(args);
    }
    cservice.options.log.apply(this, args);
  }
}

function error() {
  var args;
  var i;
  if (cservice.options.cli === true && cservice.options.error) {
    if(process.stdout.clearLine){
      process.stdout.clearLine();
    }
    if(process.stdout.cursorTo){
      process.stdout.cursorTo(0);
    }

    args = Array.prototype.slice.call(arguments);
    for (i = 0; i < args.length; i++) {
      if (typeof args[i] === "string") {
        args[i] = args[i].error;
      }
    }
    if (args.length > 0 && typeof args[0] === "string" && args[0][0] === "{") {
      cservice.options.error("cservice:".cservice);
    } else {
      args = ["cservice: ".cservice].concat(args);
    }
    cservice.options.error.apply(this, args);
  }
}

function results() {
  if(cservice.options.log){
    cservice.options.log.apply(this, arguments);
  }
}

function getArgsFromQuestion(question, delimiter) {

  // OLD WAY - simply breaks args by delimiter
  //var split = question.split(" ");
  //var args = [split[0], onCallback].concat(split.slice(1));

  // parser needs to be smarter, to account for various data types:
  // single word strings: hello
  // phrases: "hello world"
  // numbers: 1 or 1.3
  // JSON: [] or { "a": { "b": "hello \"world\"" } }
  var arg = []
    , args = []
    , stringOpen = false
    , jsonLevel = 0
    , arrayLevel = 0
    , i
    , isDelim
    , c
    , cprev
    , cnext;

  for (i = 0; i < question.length; i++) {
    cprev = i > 0 ? question[i - 1] : "";
    c = question[i];
    cnext = (i < question.length - 1) ? question[i + 1] : "";
    isDelim = (c === delimiter);
    if (stringOpen === true) { // processing quotted string
      if (c === "\"" && cprev !== "\\") { // closer
        // close string
        stringOpen = false;
        // add string arg, even if empty
        args.push(getArgFromValue(arg.join("")));
        // reset arg
        arg = [];
      } else { // just another char
        arg.push(c);
      }
    } else if (jsonLevel > 0) { // processing JSON object
      if (c === "}" && cprev !== "\\") { // closer
        jsonLevel--;
      } else if (c === "{" && cprev !== "\\") { // opener
        jsonLevel++;
      }

      arg.push(c);

      if (jsonLevel === 0) { // closed
        args.push(getArgFromValue(arg.join("")));
        // reset arg
        arg = [];
      }
    } else if (arrayLevel > 0) { // processing JSON object
      if (c === "]" && cprev !== "\\") { // closer
        arrayLevel--;
      } else if (c === "[" && cprev !== "\\") { // opener
        arrayLevel++;
      }

      arg.push(c);

      if (arrayLevel === 0) { // closed
        args.push(getArgFromValue(arg.join("")));
        // reset arg
        arg = [];
      }
    } else { // processing basic arg
      if (c === delimiter) { // delimiter
        if (arg.length > 0) { // if arg, add it
          args.push(getArgFromValue(arg.join("")));
          // reset arg
          arg = [];
        }
      } else if (c === "{" && arg.length === 0) { // JSON opener
        jsonLevel++;
        arg.push(c);
      } else if (c === "[" && arg.length === 0) { // Array opener
        arrayLevel++;
        arg.push(c);
      } else if (c === "\"" && arg.length === 0) { // string opener
        stringOpen = true;
      } else { // add it
        arg.push(c);
      }
    }
  }

  if (arg.length > 0) { // if arg remains, add it too
    args.push(getArgFromValue(arg.join("")));
  }

  return args;
}

function getArgFromValue(val) {
  try {
    // \" tags should be standard quotes after parsed
    val = val.replace(/\\\"/g, '"');

    // try to process as JSON first
    // Typical use cases:
    // 1 - number
    // 1.3 - number
    // [] - array
    // { "a": { } } - object
    return JSON.parse(val);
  } catch (ex) {
    return val; // use as-is
  }
}

function processSafeSend(process, msg) {
  try {
    process.send(msg);
  } catch (ex) {
    return ex;
  }
}
