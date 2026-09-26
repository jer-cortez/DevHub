const cp = require("child_process");
exports.convert = (filename) => cp.execFile("convert", [filename, "out.png"]);
