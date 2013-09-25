var _controls = {};

var levels = {
	"remote": 10, // anyone with credentials can access
	"local": 20, // anyone locally with credentials can access
	"inproc": 30, // CLI of the master process
	"disabled": 99 // disabled
};

function setControls(controls){
	_controls = {};
	return addControls(controls);
}

function addControls(controls){
	for(var control in controls){
		if (levels[controls[control]] === undefined){
			throw(controls[control] + " is not a valid control level.");
		}
		_controls[control] = levels[controls[control]];
	}
	return _controls;
}

function authorize(name, control){
	if (_controls[name]){
		return control >= _controls[name];
	}
	// We default to "remote" which is full access
	return control >= levels.remote;
}

exports.setControls = setControls;
exports.addControls = addControls;
exports.authorize = authorize;
exports.levels = levels;