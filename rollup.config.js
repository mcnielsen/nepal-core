import typescript from 'rollup-plugin-typescript2';
import pkg from './package.json';
import multi from '@rollup/plugin-multi-entry';

const external = [
    ...Object.keys(pkg.dependencies || {}),
    "@al/core",
    "@al/core/*"
];

const commonPlugins = [
    typescript(),
    multi(),
];

function configureEntryPoint( bundleName, directory ) {
    if ( ! directory ) {
        directory = bundleName;
    }
    return {
        input: [ `lib/${directory}/src/index.ts`,
        ],
        output: [
            {
                file: `bundles/al-core-${bundleName}.esm2015.js`,
                format: 'esm', // Keep the bundle as an ES module file
                sourcemap: true,
            },
            {
                file: `bundles/al-core-${bundleName}.es5.js`,
                format: 'cjs', // Keep the bundle as a common JS module file
                sourcemap: true,
            }
        ],
        external,
        plugins: [ ...commonPlugins ]
    };
}

export default [
    configureEntryPoint( 'nucleus' ),
    configureEntryPoint( 'testing' ),
    configureEntryPoint( 'navigation' ),
    configureEntryPoint( 'platform-browser' ),
    configureEntryPoint( 'defender' ),
    configureEntryPoint( 'support' ),
    configureEntryPoint( 'configuration' ),
    configureEntryPoint( 'incidents' ),
    configureEntryPoint( 'search' ),
    configureEntryPoint( 'assets' ),
    configureEntryPoint( 'reporting' ),
];
