const path          = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = (env) => {

    return {
        mode     : 'production',
        devtool: 'source-map',
        entry    : {
            'index': path.resolve(__dirname, './index.ts'),
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: 'ts-loader',
                    exclude: /node_modules/,
                },
            ],
        },
        resolve  : {
            extensions: [ '.tsx', '.ts', '.js' ],
            alias: {
                "@al/client"       : path.resolve(__dirname,"./src/api-client"),
                "@al/aims"         : path.resolve(__dirname,"./src/aims-client"),
                "@al/common"       : path.resolve(__dirname,"./src/nepal-common"),
                "@al/search"       : path.resolve(__dirname,"./src/search-client"),
                "@al/session"      : path.resolve(__dirname,"./src/session-client"),
                "@al/subscriptions": path.resolve(__dirname,"./src/subscriptions-client"),
            },
        },
        externals: [nodeExternals()],
        output   : {
            path         : path.resolve(__dirname, './dist/umd'),
            filename     : '[name].js',
            library      : '@al/core',
            libraryTarget: 'umd', // supports commonjs, amd and web browsers
            globalObject : 'this',
        },
        plugins  : [],
    };

};
