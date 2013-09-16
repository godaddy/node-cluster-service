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
	return control >= _controls[name];
}

exports.setControls = setControls;
exports.addControls = addControls;
exports.authorize = authorize;
exports.levels = levels;