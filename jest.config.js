const path = require("path")
const { pathsToModuleNameMapper } = require( "ts-jest" );
const { compilerOptions } = require( "./tsconfig.json" );

function configureJest( projectName ) {
  return {
    roots: [ '<rootDir>' ],
    modulePaths: [ compilerOptions.baseUrl ],
    displayName: projectName,
    setupFilesAfterEnv: ['<rootDir>/tests/test-setup.ts'],
    coverageDirectory: `./coverage`,
    /*
    coverageReporters: [ 'json-summary', ['json', {file: `${projectName}-coverage.json`}]],
    coverageProvider: 'v8',
    */
    coveragePathIgnorePatterns: [
        "<rootDir>/node_modules/",
        "<rootDir>/dist/"
    ],
    moduleNameMapper: pathsToModuleNameMapper( compilerOptions.paths ),
    reporters: [
      'default',
      ["jest-junit", {outputDirectory: `coverage/${projectName}`, outputName: `test-results-junit.xml`, suiteName: `${projectName} jest tests`}]
    ],
    'preset': 'ts-jest/presets/default-esm'
  }
}

module.exports = configureJest( "al-core" );

