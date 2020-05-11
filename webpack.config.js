"use strict";

const {from} = require("webpack-config-builder");
const path = require("path");

const pathBuild = path.resolve(__dirname, "build");

module.exports = [
    from("./src/index.tsx")
        .withCss()
        .withReact()
        .withHtml("./src/index.html", "index.html")
        .to("electron-renderer", pathBuild, "[chunkhash].js", "dev.js"),

    from("./src/api/index.ts")
        .withNativeModules()
        .to("electron-preload", pathBuild, "api.js"),

    from("./src/main/index.ts")
        .withNativeModules()
        .to("electron-main", pathBuild, "index.js"),
];