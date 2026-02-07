"use strict";
// Shared utility functions for the stat bot
Object.defineProperty(exports, "__esModule", { value: true });
exports.operationChoices = exports.statChoices = exports.getStatEmoji = exports.getRankMedal = void 0;
const getRankMedal = (rank) => {
    switch (rank) {
        case 1:
            return '🥇';
        case 2:
            return '🥈';
        case 3:
            return '🥉';
        default:
            return '📊';
    }
};
exports.getRankMedal = getRankMedal;
const getStatEmoji = (statType) => {
    const emojiMap = {
        malewife: '👨‍🍳',
        manipulate: '😈',
        mansplain: '🤓',
        gaslight: '🔥',
        gatekeep: '🐠',
        girlboss: '💅',
    };
    return emojiMap[statType] || '📈';
};
exports.getStatEmoji = getStatEmoji;
exports.statChoices = [
    { name: 'malewife', value: 'malewife' },
    { name: 'manipulate', value: 'manipulate' },
    { name: 'mansplain', value: 'mansplain' },
    { name: 'gaslight', value: 'gaslight' },
    { name: 'gatekeep', value: 'gatekeep' },
    { name: 'girlboss', value: 'girlboss' },
];
exports.operationChoices = [
    { name: 'add', value: 'add' },
    { name: 'subtract', value: 'subtract' },
];
