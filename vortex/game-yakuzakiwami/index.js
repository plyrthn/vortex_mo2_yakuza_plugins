const {register} = require('./srmm');
module.exports = {default: (context) => register(context, {
    gameId: 'yakuzakiwami',
    steamAppId: '834530',
    gameName: 'Yakuza Kiwami',
    exeName: 'YakuzaKiwami.exe',
    rmmRelPath: 'media',
})};
