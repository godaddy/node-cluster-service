var _controls = {};

var levels = {
	"remote": 10,
	"local": 20,
	"inproc": 30
};

function setControls(controls){
	_controls = controls;
	return _controls;
}

function addControls(controls){
	for(var control in controls){
		_controls[control] = controls[control];
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