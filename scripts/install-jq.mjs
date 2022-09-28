#!/usr/bin/env -S node --experimental-top-level-await

/**
 * Simpler version of [node-jq]{@link https://www.npmjs.com/package/node-jq}.
 *
 * Add as `postinstall` script to install automatically after dependencies are installed.
 */

import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import childProcess from 'node:child_process';

import 'isomorphic-fetch';

import { Paths, downloadFile } from '../config/utils/index.js';


const nodeModulesBinPath = path.resolve(Paths.ROOT.ABS, 'node_modules', '.bin');
const destination = path.resolve(nodeModulesBinPath, 'jq');
let installedGlobally = false;

try {
    const globalJqPath = childProcess
        .execSync('which jq')
        .toString()
        .replace(/\n/g, '');

    if (globalJqPath) {
        installedGlobally = true;
    }
} catch (notInstalledError) {}

if (fs.existsSync(destination)) {
    console.log('Skipping `jq` download - already installed as npm script.');
    process.exit();
}

if (installedGlobally) {
    console.log('Skipping `jq` download - already installed globally on the OS.');

    childProcess
        .execSync('ln -s "$(which jq)" node_modules/.bin/jq');

    console.log('    Created symlink at node_modules/.bin/jq for ease of use in npm scripts.');

    process.exit();
}

const osPlatform = os.platform()
    .replace(/\d/g, '') // Remove any possible bit-architecture numbers from the platform
    .replace(/darwin/i, 'osx'); // `jq` uses `osx` instead of `darwin`
const osBitArchitecture = os.arch()
    .replace(/\D/g, ''); // `jq` just uses numbers, e.g. `64` instead of `x64`

const allReleasesResponse = await fetch('https://api.github.com/repos/stedolan/jq/releases', {
    headers: {
        Accept: 'application/vnd.github+json',
    },
});
const allReleasesInfo = await allReleasesResponse.json();

allReleasesInfo.sort((releaseA, releaseB) => {
    const latterTag = parseFloat(releaseB.tag_name.replace(/[^\d.]/g, ''));
    const formerTag = parseFloat(releaseA.tag_name.replace(/[^\d.]/g, ''));

    return latterTag - formerTag;
});

const latestRelease = allReleasesInfo[0];
const downloadableAssets = latestRelease.assets;
const directExecutableAssets = downloadableAssets.filter(asset => !asset.name.match(/\.(tar|zip|gz)(\.|$)/));
let assetsForPlatform = directExecutableAssets.filter(asset => asset.name.match(new RegExp(osPlatform, 'i')));

if (!assetsForPlatform) {
    assetsForPlatform = directExecutableAssets.filter(asset => asset.name.match(/linux/i));
}

let assetForArchitecture = assetsForPlatform.find(asset => asset.name.includes(osBitArchitecture));

if (!assetForArchitecture) {
    assetForArchitecture = assetsForPlatform.find(asset => asset.name.includes('32'));
}

const downloadUrl = assetForArchitecture.browser_download_url;

await downloadFile(downloadUrl, destination);

console.log('`jq` successfully installed.');
