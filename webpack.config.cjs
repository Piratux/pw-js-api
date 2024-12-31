const webpack = require("webpack");


console.log("Node ENV:", process.env.NODE_ENV);

module.exports = {
    entry: "./dist/index.js",
    output: {
        path: __dirname + "/browser/",
        filename: 'pw.' + (process.env.NODE_ENV === "production" ? "prod" : "dev") +  '.js',
        library: {
            name: "PW",
            type: "umd",
        }
    },
    mode: process.env.NODE_ENV === "production" ? "production" : "development"
};