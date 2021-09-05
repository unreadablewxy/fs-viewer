"use strict";

const {newConfigBuilder} = require("webpack-config-builder");
const os = require("os");
const path = require("path");

const platform = os.platform();
const pathBuild = path.resolve(__dirname, "build");

const builder = newConfigBuilder()
    .withoutLicense("GPL-3.0")
    .withDefine("BUILD_TYPE", "pub", "dev")
    .withDefine("PLATFORM", platform);

var renderer = builder
    .withCss("index.css")
    .withReact()
    .withHtml("./src/application/index.html", "index.html")
    .withNoParse(/src(\\|\/)application(\\|\/)esimport.js$/);

var main = builder
    .withNativeModules()
    .withExternals({
        bindings: `require("bindings")`,
    });

if (platform === "linux") {
    main = main.withFiles([
        { from: "node_modules/abstract-socket/build/Release/bindings.node" },
    ]);
}

module.exports = [
    renderer.compile("web", "/src/application/index.ts", pathBuild, "[chunkhash].js", "dev.js"),
    builder.compile("electron-preload", "/src/api/index.ts", pathBuild, "api.js"),
    main.compile("electron-main", "/src/main/index.ts", pathBuild, "index.js"),
];