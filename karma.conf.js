module.exports = function(config){
    config.set({

        frameworks: [
            "mocha",
            "karma-typescript",
        ],

        files: [
            {pattern: "src/**/*.ts"},
            {pattern: "test/**/*.ts"},
        ],

        preprocessors: {
            "**/*.ts": ["karma-typescript"],
        },

        reporters: [
            "dots",
            "karma-typescript",
        ],

        browsers       : ['ChromeHeadlessNoSandbox'],
        browserNoActivityTimeout: 60000 * 15,
        customLaunchers: {
            ChromeHeadlessNoSandbox: {
                base : 'ChromeHeadless',
                flags: ['--no-sandbox'],
            },
        },

        karmaTypescriptConfig: {
            tsconfig: "tsconfig.spec.json",
            reports : {
                "html"        : {
                    "directory"   : "coverage",
                    "subdirectory": "report",
                },
                "text-summary": "",
                "json-summary": {
                    "directory": "coverage",
                    "subdirectory": "summary",
                    "filename": "json-summary.json"
                }
            }
        },
        singleRun: true,
        captureTimeout: 210000,
        browserDisconnectTolerance: 3,
        browserDisconnectTimeout : 210000,
        browserNoActivityTimeout : 210000,
    });
};
