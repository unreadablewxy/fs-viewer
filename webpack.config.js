"use strict";

const {from} = require("webpack-config-builder");
const os = require("os");
const path = require("path");

const platform = os.platform();
const pathBuild = path.resolve(__dirname, "build");

var renderer = from("./src/index.tsx")
    .withCss()
    .withReact()
    .withHtml("./src/index.html", "index.html")
    .to("electron-renderer", pathBuild, "[chunkhash].js", "dev.js");

var api = from("./src/api/index.ts")
    .withNativeModules()
    .to("electron-preload", pathBuild, "api.js");

var main = from("./src/main/index.ts")
    .withNativeModules();

if (platform === "linux") {
    main = main.withFiles([
        "node_modules/abstract-socket/build/Release/bindings.node"
    ]);
}

main = main.to("electron-main", pathBuild, "index.js");

module.exports = [renderer, api, main];