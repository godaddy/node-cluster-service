var
	nodeunit = require("nodeunit"),
	reporter = nodeunit.reporters.default,
	path = require("path")
;

if (process.argv.length >= 3) {
	var test = process.argv[2];
	if (path.extname(test) !== ".js") {
		test += ".js";
	}
	reporter.run(['./test/' + test]);
} else {
	reporter.run(['./test']);
}
