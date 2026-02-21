const {register} = require('./srmm');
module.exports = {default: (context) => register(context, {
    gameId: 'judgment',
    steamAppId: '2058180',
    gameName: 'Judgment',
    exeName: 'Judgment.exe',
})};
