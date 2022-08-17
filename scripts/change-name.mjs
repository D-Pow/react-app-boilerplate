#!/usr/bin/env -S node --experimental-top-level-await --experimental-json-modules
import fs from 'node:fs/promises';
import path from 'node:path';
import childProcess from 'node:child_process';
import ReadLine from 'node:readline';

import { Paths } from '../config/utils/index.js';
import packageJson from '../package.json' assert { type: 'json' };
import manifestJson from '../src/manifest.json' assert { type: 'json' };

const cliInterface = ReadLine.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function cliPrompt(query) {
    return new Promise(res => {
        cliInterface.question(query, res);
    });
}

const appName = await cliPrompt('App name (not displayed): ');
const appTitle = await cliPrompt('App title (displayed): ');
const appDescription = await cliPrompt('App description: ');
let gitRepo = await cliPrompt('Git repo: ');
const keywordsString = await cliPrompt('Keywords (comma separated): ');

cliInterface.close();

const keywords = keywordsString.split(',').map(keyword => keyword.trim());

if (!gitRepo.match(/^git\+/)) {
    gitRepo = `git+${gitRepo}`;
}

if (!gitRepo.match(/\.git$/)) {
    gitRepo = `${gitRepo}.git`;
}

packageJson.name = appName;
packageJson.repository.url = gitRepo;
packageJson.keywords = keywords;

const packageJsonPath = path.resolve(Paths.ROOT.ABS, 'package.json');
const newPackageJson = JSON.stringify(packageJson, undefined, 2) + '\n';

manifestJson.short_name = appTitle;
manifestJson.name = appDescription;

const manifestJsonPath = path.resolve(Paths.ROOT.ABS, 'src/manifest.json');
const newManifestJson = JSON.stringify(manifestJson, undefined, 4) + '\n';

await fs.writeFile(packageJsonPath, newPackageJson);
await fs.writeFile(manifestJsonPath, newManifestJson);

childProcess.execSync('npm install');

console.log('Successfully changed the app name and details');
