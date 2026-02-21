'use strict';

const path = require('path');
const https = require('https');
const {actions, fs, log, selectors, util} = require('vortex-api');

const RMM_EXE = 'ShinRyuModManager.exe';
const PARLESS_ASI = 'YakuzaParless.asi';
const EXT_MODS_PATH = '_externalMods';
const SRMM_GITHUB_API = '/repos/SRMM-Studio/ShinRyuModManager/releases/latest';
const SRMM_VERSION_PATTERN = /ShinRyuModManager(\d+\.\d+\.\d+)/i;

const TOOLS = [
    {
        id: 'rmm-run',
        name: 'Run Shin Ryu Mod Manager and launch the game',
        shortName: 'RMM',
        logo: 'SRMM.png',
        executable: () => RMM_EXE,
        requiredFiles: [RMM_EXE, PARLESS_ASI],
        parameters: ['--run', '--silent'],
        relative: true,
        shell: true,
    },
    {
        id: 'rmm-only',
        name: 'Run Shin Ryu Mod Manager only',
        shortName: 'RMM',
        logo: 'SRMM.png',
        executable: () => RMM_EXE,
        requiredFiles: [RMM_EXE, PARLESS_ASI],
        relative: true,
        shell: true,
    },
];

function versionGt(a, b) {
    const pa = (a || '0.0.0').split('.').map(Number);
    const pb = (b || '0.0.0').split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        if (pa[i] > pb[i]) return true;
        if (pa[i] < pb[i]) return false;
    }
    return false;
}

function githubGet(apiPath, gameId) {
    return new Promise((resolve, reject) => {
        function fetch(url, isRedirect) {
            const mod = isRedirect ? require('https') : https;
            mod.get(url.startsWith('http') ? url : {
                hostname: 'api.github.com',
                path: url,
                headers: {'User-Agent': `vortex-${gameId}`},
            }, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    return fetch(res.headers.location, true);
                }
                let body = '';
                res.on('data', c => body += c);
                res.on('end', () => {
                    try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
                });
            }).on('error', reject);
        }
        fetch(apiPath, false);
    });
}

function getSRMMAsset(release) {
    return (release.assets || []).find(a => SRMM_VERSION_PATTERN.test(a.name));
}

function downloadFile(url, dest, gameId) {
    return new Promise((resolve, reject) => {
        function fetch(u) {
            https.get(u, {headers: {'User-Agent': `vortex-${gameId}`}}, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    return fetch(res.headers.location);
                }
                const nativeFs = require('fs');
                const out = nativeFs.createWriteStream(dest);
                res.pipe(out);
                out.on('finish', () => out.close(resolve));
                out.on('error', reject);
            }).on('error', reject);
        }
        fetch(url);
    });
}

function importAndInstall(api, filePath, gameId, gameName) {
    return new Promise((resolve, reject) => {
        api.events.emit('import-downloads', [filePath], (dlIds) => {
            const dlId = dlIds[0];
            if (!dlId) return reject(new Error(`import failed: ${filePath}`));
            util.batchDispatch(api.store, [
                actions.setDownloadModInfo(dlId, 'source', 'other'),
                actions.setDownloadModInfo(dlId, 'game', gameId),
            ]);
            api.events.emit('start-install-download', dlId, true, (err, modId) => {
                if (err) return reject(err);
                const profileId = selectors.lastActiveProfileForGame(api.getState(), gameId);
                util.batchDispatch(api.store, [
                    actions.setModEnabled(profileId, modId, true),
                    actions.setModAttributes(gameId, modId, {
                        customFileName: 'Shin Ryu Mod Manager',
                        description: `Modding requirement for ${gameName} - keep enabled.`,
                    }),
                ]);
                resolve(modId);
            });
        });
    });
}

async function downloadSRMM(api, gameId, gameName) {
    api.sendNotification({
        id: `${gameId}-srmm-install`,
        type: 'activity',
        message: 'Downloading Shin Ryu Mod Manager...',
        noDismiss: true,
        allowSuppress: false,
    });
    try {
        const release = await githubGet(SRMM_GITHUB_API, gameId);
        const asset = getSRMMAsset(release);
        if (!asset) throw new Error('SRMM zip not found in latest release');
        const tempPath = path.join(util.getVortexPath('temp'), asset.name);
        await downloadFile(asset.browser_download_url, tempPath, gameId);
        await importAndInstall(api, tempPath, gameId, gameName);
    } catch (err) {
        api.showErrorNotification('Failed to download Shin Ryu Mod Manager', err, {allowReport: false});
    } finally {
        api.dismissNotification(`${gameId}-srmm-install`);
    }
}

function getInstalledVersion(api) {
    const downloads = util.getSafe(api.getState(), ['persistent', 'downloads', 'files'], {});
    return Object.values(downloads).reduce((best, dl) => {
        const m = SRMM_VERSION_PATTERN.exec(path.basename(dl.localPath || ''));
        return (m && versionGt(m[1], best)) ? m[1] : best;
    }, '0.0.0');
}

async function checkSRMMUpdate(api, gameId, gameName) {
    const profile = selectors.activeProfile(api.getState());
    if (profile?.gameId !== gameId) return;
    try {
        const current = getInstalledVersion(api);
        const release = await githubGet(SRMM_GITHUB_API, gameId);
        const asset = getSRMMAsset(release);
        if (!asset) return;
        const m = SRMM_VERSION_PATTERN.exec(asset.name);
        const latest = m?.[1];
        if (!latest || !versionGt(latest, current)) return;
        api.sendNotification({
            id: 'srmm-update',
            type: 'warning',
            message: `Shin Ryu Mod Manager v${latest} available`,
            allowSuppress: true,
            actions: [
                {title: 'Download', action: (dismiss) => { downloadSRMM(api, gameId, gameName); dismiss(); }},
            ],
        });
    } catch (err) {
        log('warn', 'failed to check SRMM version', err);
    }
}

async function checkForRMM(api, gameId, rmmRelPath) {
    const discovery = util.getSafe(api.getState(), ['settings', 'gameMode', 'discovered', gameId], undefined);
    if (!discovery?.path) return false;
    try {
        await fs.statAsync(path.join(discovery.path, rmmRelPath, RMM_EXE));
        return true;
    } catch {
        return false;
    }
}

function testRMMPath(instructions) {
    return Promise.resolve(instructions.some(inst =>
        inst.type === 'copy' && (
            path.basename(inst.source).toLowerCase() === RMM_EXE.toLowerCase() ||
            path.extname(inst.source).toLowerCase() === '.asi'
        )
    ));
}

function getRMMPath(api, game) {
    const discovery = selectors.discoveryByGame(api.getState(), game.id);
    return discovery?.path || '.';
}

function getCommonFolder(files) {
    if (!files?.length) return '';
    const segs = files.map(f => f.replace(/\\/g, '/').split('/'));
    let common = segs[0];
    for (let i = 1; i < segs.length; i++) {
        let j = 0;
        while (j < common.length && j < segs[i].length && common[j] === segs[i][j]) j++;
        common = common.slice(0, j);
        if (!common.length) break;
    }
    return common.length >= 1 ? common.join(path.sep) : '';
}

// rmmRelPath: subdirectory where ShinRyuModManager.exe lives, relative to game root
//             e.g. 'runtime/media' for new games, 'media' for yakuza0/kiwami, '' for root
// modsPath:   where the mods folder lives, defaults to rmmRelPath + '/mods'
function register(context, {gameId, steamAppId, gameName, exeName, rmmRelPath = path.join('runtime', 'media'), modsPath}) {
    const api = context.api;
    const actualModsPath = modsPath || path.join(rmmRelPath || '.', 'mods');
    const gameExe = path.join(rmmRelPath, exeName);

    context.registerGame({
        id: gameId,
        name: gameName,
        mergeMods: true,
        queryPath: () => util.GameStoreHelper.findByAppId([steamAppId]).then(g => g.gamePath),
        queryModPath: () => actualModsPath,
        logo: 'gameart.jpg',
        supportedTools: TOOLS,
        executable: () => gameExe,
        requiredFiles: [gameExe],
        setup: async (discovery) => {
            await fs.ensureDirAsync(path.join(discovery.path, actualModsPath));
            if (!await checkForRMM(api, gameId, rmmRelPath)) return downloadSRMM(api, gameId, gameName);
        },
        environment: {SteamAPPId: steamAppId},
        details: {steamAppId: parseInt(steamAppId)},
    });

    context.registerInstaller(
        `${gameId}-rmm-modmanager-installer`,
        20,
        (files, gId) => Promise.resolve({
            supported: gId === gameId && files.some(f => path.basename(f).toLowerCase() === RMM_EXE.toLowerCase()),
            requiredFiles: [RMM_EXE],
        }),
        (files) => {
            const instructions = files.reduce((acc, file) => {
                if (path.extname(file) !== '') {
                    acc.push({type: 'copy', source: file, destination: path.join(rmmRelPath, file)});
                }
                return acc;
            }, []);
            return Promise.resolve({instructions});
        }
    );

    context.registerInstaller(
        `${gameId}-asi-installer`,
        22,
        (files, gId) => Promise.resolve({
            supported: gId === gameId && files.some(f => path.extname(f).toLowerCase() === '.asi'),
            requiredFiles: [],
        }),
        (files) => {
            const commonFolder = getCommonFolder(files);
            const instructions = files
                .filter(f => !f.endsWith(path.sep))
                .map(f => {
                    let rel = f;
                    if (commonFolder && f.startsWith(commonFolder + path.sep)) {
                        rel = f.substring(commonFolder.length + 1);
                    }
                    return {type: 'copy', source: f, destination: path.join(rmmRelPath, rel)};
                });
            return Promise.resolve({instructions});
        }
    );

    context.registerInstaller(
        `${gameId}-mod-installer`,
        25,
        (files, gId) => Promise.resolve({supported: gId === gameId, requiredFiles: []}),
        async (files) => {
            const discovery = util.getSafe(api.getState(), ['settings', 'gameMode', 'discovered', gameId], undefined);
            if (!discovery?.path) return Promise.reject(new util.ProcessCanceled('Game not found.'));
            const commonFolder = getCommonFolder(files);
            const instructions = files
                .filter(f => !f.endsWith(path.sep))
                .map(f => {
                    let rel = f;
                    if (commonFolder && f.startsWith(commonFolder + path.sep)) {
                        rel = f.substring(commonFolder.length + 1);
                    }
                    return {type: 'copy', source: f, destination: path.join(EXT_MODS_PATH, rel)};
                });
            return {instructions};
        }
    );

    context.registerModType(
        `${gameId}-rmm-modmanager-modtype`,
        10,
        (gId) => gameId === gId,
        (game) => getRMMPath(api, game),
        testRMMPath,
        {deploymentEssential: true, name: 'RMM'}
    );

    context.once(() => {
        api.onAsync('check-mods-version', () => checkSRMMUpdate(api, gameId, gameName));
    });

    return true;
}

module.exports = {register};
