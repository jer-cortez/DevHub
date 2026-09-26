const cp = require("child_process");
exports.convert = (filename) => cp.exec("convert " + filename + " out.png");
