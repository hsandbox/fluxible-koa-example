require("babel-core/register")({
    presets: ["es2015-node5", "react", "stage-1"]
});

module.exports = require('./server');
