const {getUser}= require('../utils/storage')
const { inlineKeyboard } = require('telegraf/markup');
const { sendOrEdit } = require('../utils/helpers');
const { getArmyToType } = require('../config/army')
const { getCountTypeArmyToPlayer, checkUnlockedToPlayer } = require('../service/armyService');
const { armyName } = require('../config/army');

const armyNameToRussian = [
    getArmyToType('archers').name,
    getArmyToType('catapults').name,
    getArmyToType('immortals').name,
    getArmyToType('knights').name,
    getArmyToType('legion').name,
    getArmyToType('siege').name,
    getArmyToType('spearmen').name,
    getArmyToType('warriors').name
];


const show = async (ctx) => {
    const user = getUser(ctx.from.id);
    const countArmyToPLayer = getCountTypeArmyToPlayer(user);
    let reply = '';
    let buttons = [];
    let row = [];
    for (let i = 0; i < armyName.length; i++) {
        const type = armyName[i];
        const unlocked = checkUnlockedToPlayer(user, type);
        if (unlocked) {
            reply += `${armyNameToRussian[i]} — ${countArmyToPLayer[type]}\n`;
            const button = {
                text: armyNameToRussian[i],
                callback_data: `training_${type}`
            };
            row.push(button);
            if (row.length === 2) {
                buttons.push(row);
                row = [];
            }
        }
    }
    if (row.length > 0) {
        buttons.push(row);
    }
    buttons.push([{ text: '🔙 Назад', callback_data: 'back_to_menu' }]);
    const text = 'ТВОЯ АРМИЯ\n\n' +
        `${reply}`;
    const options = inlineKeyboard(buttons)
    sendOrEdit(ctx,text,options)
}

module.exports = {
    show
}