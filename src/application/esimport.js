/* eslint-disable */
exports.importModule = function importModule(path) {
    return import(`file://${path}`);
}