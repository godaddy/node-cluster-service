var argv = require("optimist").argv;

console.dir(argv);

require("../cluster-service").start(argv);
