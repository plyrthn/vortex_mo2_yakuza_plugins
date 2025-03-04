// Import some assets from Vortex we'll need.
const path = require('path');
const { fs, log, selectors, util } = require('vortex-api');

const GAME_ID = 'likeadragonpirateyakuzainhawaii';
const STEAMAPP_ID = '3061810';

const RMM_EXE = 'ShinRyuModManager.exe';
const PARLESS_ASI = 'YakuzaParless.asi';
const RMM_REL_PATH = path.join('runtime', 'media');
const MODS_PATH = path.join('runtime', 'media', 'mods');
const EXT_MODS_PATH = '_externalMods';
const GAME_EXE = path.join('runtime', 'media', 'startup.exe');

const MOD_TYPE_RMM = 'likeadragonpirateyakuzainhawaii-rmm-modmanager-modtype';

const {
    download, findModByFile, findDownloadIdByFile, resolveVersionByPattern,
    testRequirementVersion
} = require('./downloader');

const ARC_NAME = 'ShinRyuModManager4.5.3.zip';

const REQUIREMENTS = [
    {
        archiveFileName: ARC_NAME,
        modType: MOD_TYPE_RMM,
        assemblyFileName: RMM_EXE,
        userFacingName: 'Ryu Mod Manager',
        githubUrl: 'https://api.github.com/repos/SRMM-Studio/ShinRyuModManager',
        findMod: (api) => findModByFile(api, MOD_TYPE_RMM, RMM_EXE),
        findDownloadId: (api) => findDownloadIdByFile(api, ARC_NAME),
        fileArchivePattern: new RegExp(/^ShinRyuModManager(\d+\.\d+\.\d+)/, 'i'),
        resolveVersion: (api) => resolveVersionByPattern(api, REQUIREMENTS[0]),
    },
];

const tools = [
    {
        id: 'rmm-run',
        name: 'Run Shin Ryu Mod Manager and launch the game',
        shortName: 'RMM',
        logo: 'SRMM.png',
        executable: () => RMM_EXE,
        requiredFiles: [
            RMM_EXE,
            PARLESS_ASI,
        ],
        parameters: [
            '--run',
            '--silent',
        ],
        relative: true,
        shell: true,
    },
    {
        id: 'rmm-only',
        name: 'Run Shin Ryu Mod Manager only',
        shortName: 'RMM',
        logo: 'SRMM.png',
        executable: () => RMM_EXE,
        requiredFiles: [
            RMM_EXE,
            PARLESS_ASI,
        ],
        relative: true,
        shell: true,
    },
];

function main(context) {

    context.registerGame({
        id: GAME_ID,
        name: 'Like a Dragon: Pirate Yakuza in Hawaii',
        mergeMods: true,
        queryPath: findGame,
        queryModPath: () => MODS_PATH,
        logo: 'gameart.jpg',
        supportedTools: tools,
        executable: () => GAME_EXE,
        requiredFiles: [
            GAME_EXE,
        ],
        setup: (discovery) => prepareForModding(discovery, context.api),
        environment: {
            SteamAPPId: STEAMAPP_ID,
        },
        details: {
            steamAppId: parseInt(STEAMAPP_ID),
        },
    });

    context.registerInstaller(
        'likeadragonpirateyakuzainhawaii-rmm-modmanager-installer',
        20,
        testRMM,
        (files) => installRMM(context.api, files)
    );

    context.registerInstaller(
        'likeadragonpirateyakuzainhawaii-mod-installer',
        25,
        testMod,
        (files) => installMod(context.api, files)
    );

    context.registerModType(
        MOD_TYPE_RMM,
        10,
        (gameId) => GAME_ID === gameId,
        (game) => getRMMPath(context.api, game),
        testRMMPath,
        { deploymentEssential: true, name: 'RMM' }
    );

    context.once(() => {
        context.api.onAsync('check-mods-version', (gameId, mods, forced) => onCheckModVersion(context.api, gameId, mods, forced));
    });

    return true;
}

async function onCheckModVersion(api, gameId, mods, forced) {
    const profile = selectors.activeProfile(api.getState());
    if (profile.gameId !== gameId) {
        return;
    }
    try {
        await testRequirementVersion(api, REQUIREMENTS[0]);
    } catch (err) {
        log('warn', 'failed to test requirement version', err);
    }
}

function findGame() {
    return util.GameStoreHelper.findByAppId([STEAMAPP_ID])
        .then(game => game.gamePath);
}

function testRMMPath(instructions) {
    // Basic check: does the copy instructions include the RMM exe?
    const filtered = instructions.filter((inst) =>
        inst.type === 'copy' &&
        path.basename(inst.source).toLowerCase() === RMM_EXE.toLowerCase()
    );

    const supported = filtered.length > 0;
    return Promise.resolve(supported);
}

function getRMMPath(api, game) {
    const discovery = selectors.discoveryByGame(api.getState(), game.id);
    if (!discovery || !discovery.path) {
        return '.';
    }
    return discovery.path;
}

async function prepareForModding(discovery, api) {
    const rmmInstalled = await checkForRMM(api);
    return rmmInstalled ? Promise.resolve() : download(api, REQUIREMENTS);
}

async function checkForRMM(api) {
    const mod = await REQUIREMENTS[0].findMod(api);
    return mod !== undefined;
}

function testRMM(files, gameId) {
    const rightGame = (gameId === GAME_ID);
    const rightFile = files.some(file => path.basename(file).toLowerCase() === RMM_EXE.toLowerCase());
    return Promise.resolve({ supported: (rightGame && rightFile), requiredFiles: [RMM_EXE] });
}

function installRMM(api, files) {
    const instructions = files.reduce((accum, file) => {
        // Only process actual files.
        if (path.extname(file) === '') {
            return accum;
        }

        const instr = {
            type: 'copy',
            source: file,
            destination: path.join(RMM_REL_PATH, file),
        };
        accum.push(instr);
        return accum;
    }, []);
    return Promise.resolve({ instructions });
}

function testMod(files, gameId) {
    // Testing is handled in installMod.
    return Promise.resolve({ supported: (gameId === GAME_ID), requiredFiles: [] });
}

/*
  Updated installMod logic:
    - Compute the common top-level folder (if any) and use that to process data files.
    - Exclude ASI files from the data mod instructions.
    - Additionally scan all files for any .asi extension (anywhere in the archive) and install them,
      flattening their path (using the base filename) so that ASI files are always installed in the EXT_MODS_PATH.
*/
async function installMod(api, files) {
    // Get the game path.
    const state = api.store.getState();
    const discovery = util.getSafe(state, ['settings', 'gameMode', 'discovered', GAME_ID], undefined);
    if (!discovery?.path) {
        return Promise.reject(new util.ProcessCanceled('The game could not be discovered.'));
    }

    // Determine the common top-level folder for data files (if any).
    const commonFolder = getCommonFolder(files);

    // Filter out directories; process only actual files.
    const filtered = files.filter(file => !file.endsWith(path.sep));

    // Data mod instructions for non-ASI files.
    const dataInstructions = filtered
        .filter(file => path.extname(file).toLowerCase() !== '.asi')
        .map(file => {
            let relativePath = file;
            if (commonFolder && file.startsWith(commonFolder + path.sep)) {
                relativePath = file.substring(commonFolder.length + 1);
            }
            return {
                type: 'copy',
                source: file,
                destination: path.join(EXT_MODS_PATH, relativePath),
            };
        });

    // ASI instructions: search the entire file list for .asi files and install them (flattened to base filename).
    const asiInstructions = filtered
        .filter(file => path.extname(file).toLowerCase() === '.asi')
        .map(file => ({
            type: 'copy',
            source: file,
            destination: path.join(EXT_MODS_PATH, path.basename(file)),
        }));

    // Combine the instructions.
    const instructions = dataInstructions.concat(asiInstructions);

    return Promise.resolve({ instructions });
}

// Helper function to compute a common top-level folder from a list of file paths.
// This is useful when the mod archive is packaged with a single folder.
function getCommonFolder(files) {
    if (!files || files.length === 0) return '';
    // Normalize paths to use forward slashes for consistency.
    const normalizedFiles = files.map(f => f.replace(/\\/g, '/'));
    const segments = normalizedFiles.map(f => f.split('/'));
    if (segments.length === 0) return '';

    let common = segments[0];
    for (let i = 1; i < segments.length; i++) {
        const seg = segments[i];
        let j = 0;
        while (j < common.length && j < seg.length && common[j] === seg[j]) {
            j++;
        }
        common = common.slice(0, j);
        if (common.length === 0) break;
    }
    // Only return a common folder if it spans more than just the root filename.
    return common.length > 1 ? common.join(path.sep) : '';
}

module.exports = {
    default: main,
};
