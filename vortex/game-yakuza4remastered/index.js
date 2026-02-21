const {register} = require('./srmm');
module.exports = {default: (context) => register(context, {
    gameId: 'yakuza4remastered',
    steamAppId: '1105500',
    gameName: 'Yakuza 4 Remastered',
    exeName: 'Yakuza4.exe',
    rmmRelPath: '',
})};
