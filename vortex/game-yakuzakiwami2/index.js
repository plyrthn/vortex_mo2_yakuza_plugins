const {register} = require('./srmm');
module.exports = {default: (context) => register(context, {
    gameId: 'yakuzakiwami2',
    steamAppId: '927380',
    gameName: 'Yakuza Kiwami 2',
    exeName: 'YakuzaKiwami2.exe',
    rmmRelPath: '',
})};
