#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');

const VORTEX_DIR = __dirname;
const DIST_DIR = path.join(VORTEX_DIR, '..', 'dist');

const INCLUDE = new Set(['index.js', 'info.json', 'srmm.js', 'SRMM.png', 'gameart.jpg', 'README.md', 'CHANGELOG.md']);

const plugins = fs.readdirSync(VORTEX_DIR).filter(name =>
    (name.startsWith('game-') || name.startsWith('game_')) &&
    fs.statSync(path.join(VORTEX_DIR, name)).isDirectory()
);

fs.rmSync(DIST_DIR, {recursive: true, force: true});
fs.mkdirSync(DIST_DIR, {recursive: true});

for (const name of plugins) {
    const src = path.join(VORTEX_DIR, name);

    // sync srmm.js from shared
    fs.copyFileSync(path.join(VORTEX_DIR, 'shared', 'srmm.js'), path.join(src, 'srmm.js'));

    const info = JSON.parse(fs.readFileSync(path.join(src, 'info.json'), 'utf8'));
    const zipName = `${name}-v${info.version}.zip`;
    const zipPath = path.join(DIST_DIR, zipName);

    // stage files in a temp folder with the plugin folder structure
    const stage = path.join(DIST_DIR, '_stage', name);
    fs.mkdirSync(stage, {recursive: true});

    for (const file of fs.readdirSync(src)) {
        if (INCLUDE.has(file) && fs.existsSync(path.join(src, file))) {
            fs.copyFileSync(path.join(src, file), path.join(stage, file));
        }
    }

    // use PowerShell Compress-Archive
    const stageRoot = path.join(DIST_DIR, '_stage');
    const psCmd = `Compress-Archive -Force -Path "${stage}" -DestinationPath "${zipPath}"`;
    execSync(`powershell -Command "${psCmd.replace(/"/g, '\\"')}"`);

    console.log(`✓ ${zipName}`);
}

// cleanup stage dir
fs.rmSync(path.join(DIST_DIR, '_stage'), {recursive: true, force: true});

console.log(`\nPackaged ${plugins.length} plugins to dist/`);
