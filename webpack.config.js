"use strict";

const {from} = require("webpack-config-builder");
const os = require("os");
const path = require("path");

const platform = os.platform();
const pathBuild = path.resolve(__dirname, "build");

var renderer = from("./src/index.ts")
    .to("web", pathBuild, "[chunkhash].js", "dev.js")
    .withUnacceptableLicense("GPL-3.0")
    .withDefine("BUILD_TYPE", "pub", "dev")
    .withDefine("PLATFORM", os.platform())
    .withCss("index.css")
    .withReact()
    .withHtml("./src/index.html", "index.html")
    .withNoParse(/src(\\|\/)application(\\|\/)esimport.js$/);

var api = from("./src/api/index.ts")
    .to("electron-preload", pathBuild, "api.js")
    .withUnacceptableLicense("GPL-3.0");

var main = from("./src/main/index.ts")
    .to("electron-main", pathBuild, "index.js")
    .withUnacceptableLicense("GPL-3.0")
    .withNativeModules()
    .withDefine("BUILD_TYPE", "pub", "dev")
    .withExternals({
        bindings: `require("bindings")`,
    });

    if (platform === "linux") {
        main = main.withFiles([
            { from: "node_modules/abstract-socket/build/Release/bindings.node" },
        ]);
    }

module.exports = [
    renderer.build(),
    api.build(),
    main.build(),
];