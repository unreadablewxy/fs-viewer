const webpack = require("webpack");
const path = require("path");
const HtmlWebPackPlugin = require("html-webpack-plugin");
const TerserJSPlugin = require("terser-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const TSLintPlugin = require("tslint-webpack-plugin");
const os = require("os");
const LicenseWebpackPlugin = require('license-webpack-plugin').LicenseWebpackPlugin;

function build(pathOut, outFileName, target, env, argv) {
    var result = {
        target,

        entry: this.entrypoint,

        output: {
            path: pathOut,
            filename: outFileName,
        },

        resolve: {
            extensions: this.extensions,
        },

        devtool: this.devtool,

        module: {
            rules: this.rules,
        },

        plugins: this.plugins.concat(new TSLintPlugin({
            files: ['./src/**/*.ts']
        })),
    };

    if (argv.mode === "production") {
        result.devtool = undefined;

        result.optimization = {
            minimizer: [
                new TerserJSPlugin({
                    cache: true,
                    parallel: true,
                    sourceMap: false,
                    terserOptions: {},
                    exclude: /\.(sa|c)ss$/,
                }),
            ],
        };

        result.plugins = result.plugins.concat(
            new LicenseWebpackPlugin({
                perChunkOutput: true,
                addBanner: true,
                outputFilename: "LICENSES.txt",
                preferredLicenseTypes: ["MIT", "ISC"]
            }));
    } else {
        result.output.filename = result.output.filename.replace(/\[hash\]/g, "dev");
    }

    return result;
}

const platform = os.platform();

const defaults = {
    devtool: "source-map",

    extensions: [`.${platform}.ts`, `.${platform}.js`, ".ts", ".js"],

    plugins: [],

    rules: [
        {
            test: /\.(j|t)s(x?)$/,
            exclude: /node_modules/,
            loader: "babel-loader",
        },
    ],

    withExtensions: function withExtensions(extensions) {
        var result = Object.create(this);
        result.extensions = this.extensions.concat(extensions);
        return result;
    },

    withPlugin: function withPlugin(plugin) {
        var result = Object.create(this);
        result.plugins = this.plugins.concat(plugin);
        return result;
    },

    withRule: function withRule(rule) {
        var result = Object.create(this);
        result.rules = this.rules.concat(rule);
        return result;
    },

    withReact: function() {
        return this.withExtensions([".jsx", ".tsx"]);
    },

    withCss: function withCss() {
        return this.withPlugin(new MiniCssExtractPlugin({
            filename: "[name].css",
            chunkFilename: "[id].css",
        })).withRule({
            test: /\.sass$/,
            use: [
                MiniCssExtractPlugin.loader,
                "css-loader",
                "sass-loader",
            ],
        });
    },

    withHtml: function withHtml(template, filename) {
        return this.withPlugin(new HtmlWebPackPlugin({template, filename}));
    },

    withNativeModules: function withNativeModules() {
        return this.withRule({
            test: /\.node$/,
            use: 'node-loader'
        }).withExtensions([".node"]);
    },

    to: function to(pathOut, outFileName, target) {
        return build.bind(this, pathOut, outFileName, target || "web");
    },
};

function from(entrypoint) {
    var result = Object.create(defaults);
    result.entrypoint = entrypoint;
    return result;
}

const pathBuild = path.resolve(__dirname, "build");

const uiConfig = from("./src/index.tsx")
    .withCss()
    .withReact()
    .withHtml("./src/index.html", "index.html")
    .to(pathBuild, "[chunkhash].js", "electron-renderer");

const apiConfig = from("./src/api/index.ts")
    .withNativeModules()
    .to(pathBuild, "api.js", "electron-preload");

const mainConfig = from("./src/main/index.ts")
    .withNativeModules()
    .to(__dirname, "index.js", "electron-main");

module.exports = [uiConfig, apiConfig, mainConfig];