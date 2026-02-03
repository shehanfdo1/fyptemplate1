const webpack = require('webpack');

module.exports = function override(config) {
    const fallback = config.resolve.fallback || {};
    Object.assign(fallback, {
        "crypto": require.resolve("crypto-browserify"),
        "stream": require.resolve("stream-browserify"),
        "assert": require.resolve("assert"),
        "http": require.resolve("stream-http"),
        "https": require.resolve("https-browserify"),
        "os": require.resolve("os-browserify"),
        "url": require.resolve("url"),
        "path": require.resolve("path-browserify"),
        "constants": require.resolve("constants-browserify"),
        "util": require.resolve("util/"),
        "net": false,
        "fs": false,
        "tls": false,
        "child_process": false,
    });
    config.resolve.fallback = fallback;
    const alias = config.resolve.alias || {};
    Object.assign(alias, {
        "process/browser": "process/browser.js",
        "os": require.resolve("./src/os-shim.js")
    });
    config.resolve.alias = alias;

    config.plugins = (config.plugins || []).concat([
        new webpack.ProvidePlugin({
            process: 'process/browser.js',
            Buffer: ['buffer', 'Buffer']
        })
    ]);
    config.ignoreWarnings = [/Failed to parse source map/];
    return config;
};
