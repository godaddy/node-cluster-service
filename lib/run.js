var
	util = require("util"),
	http = require("http"),
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
    var body = "", err;
    http.request(
        {
            host: options.host || "localhost",
            port: options.port || 11987,
            path: "/cli?" + qs,
            method: "POST"
        }, function(res) {
            res.setEncoding('utf8');
            res.on("data", function(chunk) {
                body += chunk;
            });
            res.on("end", function() {
        	    if (res.statusCode !== 200 && body) {
                    err = body;
                }
	            if (err) {
			        cservice.error("Error: ", err);
			        body = { statusCode: res ? res.statusCode : "no response", error: err };
		        } else if (typeof body === "string" && (body.indexOf("{") === 0 || body.indexOf("[") === 0)) {
				    body = JSON.parse(body); // deserialize
		        }
		        if (options.json === true) {
			        cservice.results(JSON.stringify(body));
		        } else {
			        cservice.results(util.inspect(body, { depth: null, colors: true }));
		        }
		
		        cb && cb(err, body);
            });
        }
    ).on("error", function(err) {
        body = err;

		if (options.json === true) {
			cservice.results(JSON.stringify(body));
		} else {
			cservice.results(util.inspect(body, { depth: null, colors: true }));
		}

        cb && cb(err, body);
    }).end();
}
