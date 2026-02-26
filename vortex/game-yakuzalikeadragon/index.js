const path = require('path');
const {register, githubGet, downloadFile} = require('./srmm');
const {actions, fs, log, selectors, util} = require('vortex-api');

const GAME_ID = 'yakuzalikeadragon';
const GAME_NAME = 'Yakuza: Like a Dragon';
const DELIB_GITHUB_API = '/repos/Fronkln/Dragon-Engine-.NET/releases/latest';
const DELIB_ASSET_NAME = 'DELibrary.YLAD.zip';
const DELIB_DEST = path.join('runtime', 'media', 'srmm-libs', 'DE Library');

function delibImportAndInstall(api, filePath) {
    return new Promise((resolve, reject) => {
        api.events.emit('import-downloads', [filePath], (dlIds) => {
            const dlId = dlIds[0];
            if (!dlId) return reject(new Error(`import failed: ${filePath}`));
            util.batchDispatch(api.store, [
                actions.setDownloadModInfo(dlId, 'source', 'other'),
                actions.setDownloadModInfo(dlId, 'game', GAME_ID),
            ]);
            api.events.emit('start-install-download', dlId, true, (err, modId) => {
                if (err) return reject(err);
                const profileId = selectors.lastActiveProfileForGame(api.getState(), GAME_ID);
                util.batchDispatch(api.store, [
                    actions.setModEnabled(profileId, modId, true),
                    actions.setModAttributes(GAME_ID, modId, {
                        customFileName: 'Dragon Engine .NET Library',
                        description: `Modding requirement for ${GAME_NAME} - keep enabled.`,
                    }),
                ]);
                resolve(modId);
            });
        });
    });
}

async function downloadDelib(api) {
    api.sendNotification({
        id: `${GAME_ID}-delib-install`,
        type: 'activity',
        message: 'Downloading Dragon Engine .NET Library...',
        noDismiss: true,
        allowSuppress: false,
    });
    try {
        const release = await githubGet(DELIB_GITHUB_API, GAME_ID);
        const asset = (release.assets || []).find(a => a.name === DELIB_ASSET_NAME);
        if (!asset) throw new Error('DELibrary.YLAD.zip not found in latest release');
        const tempPath = path.join(util.getVortexPath('temp'), asset.name);
        await downloadFile(asset.browser_download_url, tempPath, GAME_ID);
        await delibImportAndInstall(api, tempPath);
    } catch (err) {
        api.showErrorNotification('Failed to download Dragon Engine .NET Library', err, {allowReport: false});
    } finally {
        api.dismissNotification(`${GAME_ID}-delib-install`);
    }
}

async function checkDelibInstalled(api) {
    const discovery = util.getSafe(api.getState(), ['settings', 'gameMode', 'discovered', GAME_ID], undefined);
    if (!discovery?.path) return false;
    try {
        await fs.statAsync(path.join(discovery.path, DELIB_DEST, 'DE Library', 'DELibrary.NET.dll'));
        return true;
    } catch {
        return false;
    }
}

module.exports = {default: (context) => {
    register(context, {
        gameId: GAME_ID,
        steamAppId: '1235140',
        gameName: GAME_NAME,
        exeName: 'YakuzaLikeADragon.exe',
    });

    // DELibrary installer: routes DELib zip contents into srmm-libs/delib/
    context.registerInstaller(
        `${GAME_ID}-delib-installer`,
        21,
        (files, gId) => Promise.resolve({
            supported: gId === GAME_ID && files.some(f =>
                path.basename(f).toLowerCase() === 'delibinitializer.asi'
            ),
            requiredFiles: [],
        }),
        (files) => {
            const instructions = files
                .filter(f => !f.endsWith(path.sep))
                .map(f => ({type: 'copy', source: f, destination: path.join(DELIB_DEST, f)}));
            return Promise.resolve({instructions});
        }
    );

    context.once(() => {
        const api = context.api;
        api.onAsync('gamemode-activated', async (gameMode) => {
            if (gameMode !== GAME_ID) return;
            if (!await checkDelibInstalled(api)) {
                await downloadDelib(api);
            }
        });
    });
}};
