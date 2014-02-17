var _controls = {};
var _keys = {};

var levels = {
  "remote": 10, // anyone with credentials can access
  "local": 20, // anyone locally with credentials can access
  "inproc": 30, // CLI of the master process
  "disabled": 99 // disabled
};

function setControls(controls) {
  _controls = {};
  return addControls(controls);
}

function addControls(controls) {
  var control;
  for (control in controls) {
    if (levels[controls[control]] === undefined) {
      throw(controls[control] + " is not a valid control level.");
    }
    _controls[control] = levels[controls[control]];
  }
  return _controls;
}

function setAccessKey(keys) {
  _keys = {};
  
  var keyArr = keys.split(";");
  for (var i = 0; i < keyArr.length; i++) {
    var fullKey = keyArr[i];
    var keyName = /([a-zA-Z0-9]*)?/.exec(fullKey)[0];
    var keyDisabled = /[a-zA-Z0-9]*\:disabled/.test(fullKey);
    if (keyDisabled === true) {
      _keys[keyName] = false;
      continue;
    }
    
    var key = { };
    var cmdList = /\[(.*)?\]/.exec(fullKey);
    if (cmdList && cmdList.length > 0) {
      var cmds = cmdList[1].split(",");
      for (var i2 = 0; i2 < cmds.length; i2++ ){
        var fullCmd = cmds[i2];
        var cmdName = /([a-zA-Z0-9]*)?/.exec(fullCmd)[0];
        var cmdValStr = /\:(.*)?/.exec(fullCmd);
        var cmdVal = true;
        if (cmdValStr && cmdValStr.length > 0) {
          switch (cmdValStr[1]) {
            case "false":
            case "disabled":
              cmdVal = "disabled";
              break;
            case "remote":
              cmdVal = "remote";
              break;
            case "local":
              cmdVal = "local";
              break;
            case "inproc":
              cmdVal = "inproc";
              break;
          }
          
          key[cmdName] = cmdVal;
        }
      }
    }

    _keys[keyName] = key;
  }
}

function authorize(name, currentControl, accessKey) {
  if (typeof accessKey === "string" && accessKey in _keys) {
    // if access key available, check rights
    var rights = _keys[accessKey];
    if (rights === false) {
      return false; // DENIED
    } else if (typeof rights === "object" && name in rights) {
      // custom rights detected
      var commandRight = rights[name];
      if (typeof commandRight === "boolean") {
        return commandRight; // return as is
      } else if (typeof commandRight === "string" && commandRight in levels) {
        return currentControl >= levels[commandRight];
      }
    }
  }
  
  if (_controls[name]) {
    return currentControl >= _controls[name];
  }
  // We default to "remote" which is full access
  return currentControl >= levels.remote;
}

exports.setControls = setControls;
exports.addControls = addControls;
exports.setAccessKey = setAccessKey;
exports.authorize = authorize;
exports.levels = levels;