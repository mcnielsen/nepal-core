import * as fs from 'fs';
import * as path from 'path';
import * as childProcess from 'child_process';
import { Extractor, ExtractorConfig, ExtractorResult } from '@microsoft/api-extractor';

async function buildPackage( entryPoint:string ) {
    const rollupConfig = JSON.parse( fs.readFileSync( "api-extractor.base.json", { encoding: 'utf8' } ) ) as any;
    const tsConfig = JSON.parse( fs.readFileSync( "tsconfig.json", { encoding: 'utf8' } ) ) as any;

    rollupConfig.mainEntryPointFilePath = `bundles/${entryPoint}/src/index.d.ts`;
    rollupConfig.dtsRollup.untrimmedFilePath = `types/al-core-${entryPoint}.d.ts`;
    tsConfig.include = [
        `bundles/${entryPoint}/src/index.d.ts`
    ];
    tsConfig.files = [
        `bundles/${entryPoint}/src/index.d.ts`
    ];
    tsConfig.compilerOptions.paths = {};
    rollupConfig.compiler = {
        overrideTsconfig: tsConfig
    };
    fs.writeFileSync( `apiextractor.temp.json`, JSON.stringify( rollupConfig ), { encoding: 'utf8' } );

    const extractorConfig = ExtractorConfig.loadFileAndPrepare( `apiextractor.temp.json` );

    const result = Extractor.invoke( extractorConfig, { localBuild: true, showVerboseMessages: true } );

    fs.rmSync( `apiextractor.temp.json` );

    if ( entryPoint !== 'nucleus' ) {
        const packageJson = {
            name: `@al/core/${entryPoint}`,
            main: `../bundles/al-core-${entryPoint}.es5.js`,
            module: `../bundles/al-core-${entryPoint}.esm2015.js`,
            typings: `../types/al-core-${entryPoint}.d.ts`
        };
        if ( ! fs.existsSync( `${entryPoint}` ) ) {
            fs.mkdirSync( entryPoint );
        }
        fs.writeFileSync( `${entryPoint}/package.json`, JSON.stringify( packageJson, null, 4 ), { encoding: 'utf8' } );
    }

    childProcess.execSync( `rm -rf bundles/${entryPoint}`, { stdio: 'inherit' } );
}

async function buildPackages() {
    let subEntryPoints = fs.readdirSync( `./lib` )
                            .filter( entryPoint => entryPoint && ! entryPoint.startsWith(".") );
    await Promise.all( subEntryPoints.map( entryPoint => buildPackage( entryPoint ) ) );
}

async function main() {
    await buildPackages();
}

main();
