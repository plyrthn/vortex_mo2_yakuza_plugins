const {register} = require('./srmm');
module.exports = {default: (context) => register(context, {
    gameId: 'likeadragongaiden',
    steamAppId: '2375550',
    gameName: 'Like a Dragon Gaiden',
    exeName: 'startup.exe',
})};
