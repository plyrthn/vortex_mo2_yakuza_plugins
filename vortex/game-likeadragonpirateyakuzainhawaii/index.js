//Import some assets from Vortex we'll need.
const path = require('path');
const {fs, log, selectors, util} = require('vortex-api');

const GAME_ID = 'likeadragonpirateyakuzainhawaii';
const STEAMAPP_ID = '3061810';

const RMM_MODPAGE = 'https://github.com/SRMM-Studio/ShinRyuModManager/releases/latest';
const RMM_EXE = 'ShinRyuModManager.exe';
const PARLESS_ASI = 'YakuzaParless.asi';
const RMM_REL_PATH = path.join('runtime', 'media');
const DATA_PATH = path.join('runtime', 'media', 'data');
const MODS_PATH = path.join('runtime', 'media', 'mods');
const EXT_MODS_PATH = '_externalMods'
const GAME_EXE = path.join('runtime', 'media', 'startup.exe');

const MOD_TYPE_RMM = 'likeadragonpirateyakuzainhawaii-rmm-modmanager-modtype';

const {
    download, findModByFile, findDownloadIdByFile, resolveVersionByPattern,
    testRequirementVersion
} = require('./downloader');

const ARC_NAME = 'ShinRyuModManager4.5.1.zip';

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
        id: 'rmm',
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
        id: 'rmm',
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
        {deploymentEssential: true, name: 'RMM'}
    );

    context.once(() => {
        context.api.onAsync('check-mods-version', (gameId, mods, forced) => onCheckModVersion(context.api, gameId, mods, forced));
    })

    return true
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
    // Pretty basic set up right now.
    const filtered = instructions
        .filter((inst) => (inst.type === 'copy')
            && (path.basename(inst.source).toLowerCase() === RMM_EXE.toLowerCase()));

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
    // return checkForRMM(api, path.join(discovery.path, 'runtime', 'media', RMM_EXE));
}

async function checkForRMM(api) {
    const mod = await REQUIREMENTS[0].findMod(api);
    return mod !== undefined;
}

function testRMM(files, gameId) {
    const rightGame = (gameId === GAME_ID);
    const rightFile = files.some(file => path.basename(file).toLowerCase() === RMM_EXE.toLowerCase());
    return Promise.resolve({supported: (rightGame && rightFile), requiredFiles: [RMM_EXE]});
}

function installRMM(api, files) {
    const instructions = files.reduce((accum, file) => {
        // Make sure we create instructions only for files.
        if (path.extname(file) === '') {
            return accum;
        }

        const instr = {
            type: 'copy',
            source: file,
            destination: path.join(RMM_REL_PATH, file),
        }
        accum.push(instr);
        return accum;
    }, []);
    return Promise.resolve({instructions});
}

function testMod(files, gameId) {
    // Leave the actual "testing" to installMod()
    return Promise.resolve({supported: (gameId === GAME_ID), requiredFiles: []});
}

async function installMod(api, files) {
    // Get the path to the game.
    const state = api.store.getState();
    const discovery = util.getSafe(state, ['settings', 'gameMode', 'discovered', GAME_ID], undefined);
    if (!discovery?.path) return Promise.reject(new util.ProcessCanceled('The game could not be discovered.'));

    const dataPath = path.join(discovery.path, DATA_PATH);

    // Find the root of the folder containing the modded files
    let rootPath = await findRootPath(files, dataPath);

    if (rootPath === '')
        return Promise.reject(new util.DataInvalid('Unrecognized or invalid mod. Manual installation is required.'));
    else if (rootPath === '.')
        rootPath = '';      // Fix root

    const idx = rootPath.length;
    let filtered = files.filter(file => (!file.endsWith(path.sep)) && (file.indexOf(rootPath) !== -1));

    const unsupported = findUnsupportedFiles(filtered);

    if (unsupported.length > 0) {
        api.sendNotification({
            id: 'yakuza-mod-unsupported-files',
            type: 'info',
            title: 'Mod may have unsupported files',
            message: 'This mod contains files that cannot be loaded by RMM. These files will not be copied to the mod folder, and will require manual installation.',
        });

        filtered = filtered.filter(file => (!unsupported.includes(file)));
    }

    // Check for other folders with modded files
    const otherPath = await findRootPath(files.filter(file => (file.indexOf(rootPath) === -1)), dataPath);

    if (otherPath !== '') {
        api.sendNotification({
            id: 'yakuza-mod-multiple-files',
            type: 'info',
            title: 'Mod may have additional files',
            message: 'This mod contains multiple folders with modded files. It may either have alternative options, or additional files that require manual installation.',
        });
    }

    return Promise.map(filtered, file => {
        return Promise.resolve({
            type: 'copy',
            source: file,
            destination: path.join(EXT_MODS_PATH, file.substr(idx)),
        });
    }).then(instructions => Promise.resolve({instructions}));
}

async function findRootPath(files, dataPath) {
    // We expect this to stop very early, unless the mod is actually invalid
    for (let i = 0; i < files.length; i++) {
        let base = path.basename(files[i]);

        let found = false;

        await fs.statAsync(path.join(dataPath, base)).then(() => {
            found = true;
        }).catch(() => {
        });

        if (!found) {
            if (files[i].endsWith(path.sep)) {
                await fs.statAsync(path.join(dataPath, base + '.par')).then(() => {
                    found = true;
                }).catch(() => {
                });
            }
        }

        if (found) {
            return Promise.resolve(path.dirname(files[i]));
        }
    }

    return Promise.resolve('');
}

function findUnsupportedFiles(files) {
    return [];
}

module.exports = {
    default: main,
};
