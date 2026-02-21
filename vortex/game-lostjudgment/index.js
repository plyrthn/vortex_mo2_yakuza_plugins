const {register} = require('./srmm');
module.exports = {default: (context) => register(context, {
    gameId: 'lostjudgment',
    steamAppId: '2058190',
    gameName: 'Lost Judgment',
    exeName: 'LostJudgment.exe',
})};
