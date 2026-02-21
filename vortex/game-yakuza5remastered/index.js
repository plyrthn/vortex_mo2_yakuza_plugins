const path = require('path');
const {register} = require('./srmm');
module.exports = {default: (context) => register(context, {
    gameId: 'yakuza5remastered',
    steamAppId: '1105510',
    gameName: 'Yakuza 5 Remastered',
    exeName: 'Yakuza5.exe',
    rmmRelPath: 'main',
})};
