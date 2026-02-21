const {register} = require('./srmm');
module.exports = {default: (context) => register(context, {
    gameId: 'yakuzalikeadragon',
    steamAppId: '1235140',
    gameName: 'Yakuza: Like a Dragon',
    exeName: 'YakuzaLikeADragon.exe',
})};
