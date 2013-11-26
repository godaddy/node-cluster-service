var
	util = require("util"),
	request = require("request"),
	querystring = require("querystring"),
	options = null,
	cservice = require("../cluster-service")
;

exports.start = function(o, cb) {
	options = o;

	var cmd = options.run;
	delete options.run;
	
	run(cmd, cb);
};

function run(question, cb) {
	var split = question.split(" ");
	var qs = querystring.stringify({
		cmd: question,
		accessKey: options.accessKey
	});
	var url = "http://" + (options.host || "localhost") + ":" + (options.port || 11987) + "/cli"
		+ "?" + qs
	;
	cservice.log("Running remote command: ".warn + url.replace(/accessKey=.*/i, "accessKey={ACCESS_KEY}").data);
	request.post(url, function (err, res, body) {
	    if (res && res.statusCode !== 200 && !err && body) {
	        err = body;
	    }
	    if (err) {
			cservice.error("Error: ", err);
			body = { statusCode: res ? res.statusCode : "no response", error: err };
		} else if (body) {
			if (typeof body === "string" && (body.indexOf("{") === 0 || body.indexOf("[") === 0)) {
				body = JSON.parse(body); // deserialize
			}
		}
		if (options.json === true) {
			cservice.results(JSON.stringify(body));
		} else {
			cservice.results(util.inspect(body, { depth: null, colors: true }));
		}
		
		cb && cb(err, body);
	});
}
