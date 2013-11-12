var
	util = require("util"),
	request = require("request"),
	querystring = require("querystring"),
	options = null,
	cservice = require("../cluster-service")
;

exports.start = function(o, cb) {
	options = o;

	run(options.run, cb);
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
	cservice.log("Running remote command: " + url);
	request.post(url, function (err, res, body) {
		if (err) {
			cservice.error("Error: ", err);
			body = { error: err };
		} else if (body) {
			if (typeof body === "string" && (body.indexOf("{") === 0 || body.indexOf("[") === 0)) {
				body = JSON.parse(body); // deserialize
			}
		}
		cservice.results(util.inspect(body, { depth: null }));
		
		cb && cb(err, body);
	});
}
