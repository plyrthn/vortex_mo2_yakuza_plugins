const {register} = require('./srmm');
module.exports = {default: (context) => register(context, {
    gameId: 'yakuza3remastered',
    steamAppId: '1088710',
    gameName: 'Yakuza 3 Remastered',
    exeName: 'Yakuza3.exe',
    rmmRelPath: '',
})};
