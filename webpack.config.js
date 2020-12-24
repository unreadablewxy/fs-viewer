"use strict";

const {from} = require("webpack-config-builder");
const os = require("os");
const path = require("path");

const platform = os.platform();
const pathBuild = path.resolve(__dirname, "build");

var renderer = from("./src/index.tsx")
    .to("web", pathBuild, "[chunkhash].js", "dev.js")
    .withCss("index.css")
    .withReact()
    .withHtml("./src/index.html", "index.html")
    .withNoParse(/src\/application\/esimport.js$/);

var api = from("./src/api/index.ts")
    .to("electron-preload", pathBuild, "api.js")
    .withNativeModules();

var main = from("./src/main/index.ts")
    .to("electron-main", pathBuild, "index.js")
    .withNativeModules();

if (platform === "linux") {
    main = main.withFiles({
        patterns: [
            { from: "node_modules/abstract-socket/build/Release/bindings.node" },
        ],
    });
}

module.exports = [
    renderer.build(),
    api.build(),
    main.build(),
];