var cservice = require("../cluster-service"),
    path = require("path"),
    fs = require("fs"),
    cluster = require("cluster");

exports.on = on;
exports.register = register;

function on(eventName, cb, overwriteExisting) {
  var evt;
  var controls;
  if (cluster.isMaster === false) {
    // no action to take on workers -- convenience feature as to not 
    // pollute master code
    return;
  }

  overwriteExisting = overwriteExisting || true;
  if (!overwriteExisting && eventName in cservice.locals.events) {
    return; // do not overwrite existing
  }

  evt = {
    name: eventName,
    service: cservice,
    locals: cservice.locals,
    cb: cb
  };

  // Adding control for this eventName
  if (typeof cb.control === "function") {
    controls = {};
    controls[eventName] = cb.control();
    require("./control").addControls(controls);
  }

  // overwrite existing, if any
  cservice.locals.events[eventName] = evt;
}

function register(commands, overwriteExisting) {
  if (typeof commands === "string") {
    commands = commands.split(",");
  } else if (typeof commands !== "object") {
    throw new Error("Option 'commands' must be a comma-delimited " +
      "string or an array of strings.");
  }

  for (var i = 0; i < commands.length; i++) {
    var dir = commands[i];
    if (dir.indexOf(":\\") !== 1 && dir.indexOf("/") !== 0) {
      // if not absolute, resolve path from cwd
      dir = path.resolve(process.cwd(), dir);
    }

    var files = fs.readdirSync(dir);
    for (var f = 0; f < files.length; f++) {
      var fn = path.resolve(dir, files[f]);
      var ext = path.extname(fn);
      if (ext !== ".js")
        continue; // only js files permitted
      var basename = path.basename(fn, ".js");
      var mod = require(fn); // load command module
      if (typeof mod.id === "string") {
        basename = mod.id; // use module id if available
      }
      on(basename, mod, overwriteExisting);
    }
  }
}

if (cluster.isMaster === true && cservice.locals.firstTime === true) {
	cservice.locals.firstTime = false;

  var dir = path.dirname(module.filename);
  register(path.resolve(dir, "./commands"), false);
}