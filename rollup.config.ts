import copy from 'rollup-plugin-copy'
import typescript from 'rollup-plugin-typescript2';
import pkg from './package.json';


const external = [
    ...Object.keys(pkg.dependencies || {}),
];

export default [
    {
        input: 'src/index.ts', // our source file
        output: [
            {
                file: pkg.main, // main
                format: "cjs", // CommonJS , uses require etc, suitable for Node and other bundlers (alias: commonjs)
                sourcemap: true,
            },
            {
                file: pkg.es2015,
                format: 'esm', // Keep the bundle as an ES module file
                sourcemap: true,
            },
        ],
        external,
        plugins: [
            typescript({
                typescript: require('typescript'),
            }),
            // terser() // minifies generated bundles
            copy({
                targets: [
                    { src: 'tslint.json', dest: 'dist/config' },
                ],
            }),
        ],
    },
    // to make a es5 bundle
    // https://github.com/stereobooster/package.json#package-bundlers
    // module has import and export, but none of the other new stuff
    // have to taget es5 right now because angular7 uses es5, revist in angular9
    // todo: revist when angular 9
    {
        input: 'src/index.ts', // our source file
        output: [
            {
                file: pkg.module,
                format: 'es', // Keep the bundle as an ES module file
                sourcemap: true,
            },
        ],
        external,
        plugins: [
            typescript({
                typescript: require('typescript'),
                tsconfigOverride: { compilerOptions: { target: "es5" } },
            }),
            // terser() // minifies generated bundles
            copy({
                targets: [
                    { src: 'tslint.json', dest: 'dist/config' },
                ],
            }),
        ],
    },
];
