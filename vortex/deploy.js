#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const VORTEX_PLUGINS = path.join(process.env.APPDATA, 'Vortex', 'plugins');
const VORTEX_DIR = __dirname;

const plugins = fs.readdirSync(VORTEX_DIR).filter(name =>
    (name.startsWith('game-') || name.startsWith('game_')) &&
    fs.statSync(path.join(VORTEX_DIR, name)).isDirectory()
);

for (const name of plugins) {
    const src = path.join(VORTEX_DIR, name);
    const dest = path.join(VORTEX_PLUGINS, name);

    // sync srmm.js from shared into the plugin folder
    fs.copyFileSync(path.join(VORTEX_DIR, 'shared', 'srmm.js'), path.join(src, 'srmm.js'));

    // deploy to Vortex
    fs.rmSync(dest, {recursive: true, force: true});
    fs.cpSync(src, dest, {recursive: true});

    console.log(`✓ ${name}`);
}
