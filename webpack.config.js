const path          = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = (env) => {

    return {
        mode     : 'production',
        entry    : {
            'index': path.resolve(__dirname, './dist/commonjs/index.js'),
        },
        resolve  : {
            alias: {
                "@al/client"       : path.resolve(__dirname,"./dist/commonjs/src/api-client"),
                "@al/aims"         : path.resolve(__dirname,"./dist/commonjs/src/aims-client"),
                "@al/common"       : path.resolve(__dirname,"./dist/commonjs/src/nepal-common"),
                "@al/search"       : path.resolve(__dirname,"./dist/commonjs/src/search-client"),
                "@al/session"      : path.resolve(__dirname,"./dist/commonjs/src/session-client"),
                "@al/subscriptions": path.resolve(__dirname,"./dist/commonjs/src/subscriptions-client"),
            },
        },
        externals: [nodeExternals()],
        output   : {
            path         : path.resolve(__dirname, './dist/umd'),
            filename     : '[name].js',
            library      : 'aimsClient',
            libraryTarget: 'umd', // supports commonjs, amd and web browsers
            globalObject : 'this',
        },
        plugins  : [],
    };

};
