const path = require('path');
const {register} = require('./srmm');
module.exports = {default: (context) => register(context, {
    gameId: 'yakuza0',
    steamAppId: '638970',
    gameName: 'Yakuza 0',
    exeName: 'Yakuza0.exe',
    rmmRelPath: 'media',
})};
