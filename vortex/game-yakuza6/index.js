const {register} = require('./srmm');
module.exports = {default: (context) => register(context, {
    gameId: 'yakuza6',
    steamAppId: '1388590',
    gameName: 'Yakuza 6: The Song of Life',
    exeName: 'Yakuza6.exe',
    rmmRelPath: '',
})};
