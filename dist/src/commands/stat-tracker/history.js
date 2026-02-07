"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute = exports.data = void 0;
const discord_js_1 = require("discord.js");
const database_1 = require("../../database/database");
const utils_1 = require("../../utils/utils");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('history')
    .setDescription('View the point history for a user')
    .addUserOption((option) => option
    .setName('user')
    .setDescription('The user to check history for')
    .setRequired(true))
    .addStringOption((option) => option
    .setName('category')
    .setDescription('Filter by specific category (optional)')
    .setRequired(false)
    .addChoices(...utils_1.statChoices))
    .addIntegerOption((option) => option
    .setName('limit')
    .setDescription('Number of recent transactions to show (default: 10, max: 25)')
    .setMinValue(1)
    .setMaxValue(25)
    .setRequired(false));
const execute = async (interaction) => {
    const user = interaction.options.getUser('user');
    const category = interaction.options.getString('category');
    const limit = interaction.options.getInteger('limit') || 10;
    try {
        const historyResult = await (0, database_1.getUserPointHistory)(user.id, category, limit);
        const history = historyResult.results || [];
        if (history.length === 0) {
            const filterText = category ? ` for ${category}` : '';
            await interaction.reply(`${user.username} has no transaction history${filterText}!`);
            return;
        }
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle(`📜 Point History for ${user.username}`)
            .setThumbnail(user.displayAvatarURL())
            .setColor(0x9932cc)
            .setTimestamp();
        if (category) {
            embed.setDescription(`Showing recent ${category} transactions`);
        }
        else {
            embed.setDescription(`Showing ${history.length} most recent transactions`);
        }
        // Build transaction list
        let transactionList = '';
        history.forEach((transaction, index) => {
            const emoji = (0, utils_1.getStatEmoji)(transaction.category_name);
            const sign = transaction.amount >= 0 ? '+' : '';
            const date = new Date(transaction.created_at).toLocaleDateString();
            const giverText = transaction.giver_id === 'system'
                ? 'System'
                : `<@${transaction.giver_id}>`;
            transactionList += `${emoji} **${sign}${transaction.amount}** ${transaction.category_name}\n`;
            transactionList += `   From: ${giverText} • ${date}\n`;
            if (transaction.reason) {
                transactionList += `   *${transaction.reason}*\n`;
            }
            transactionList += '\n';
        });
        embed.addFields({
            name: 'Recent Transactions',
            value: transactionList || 'No transactions found',
            inline: false,
        });
        await interaction.reply({ embeds: [embed] });
    }
    catch (error) {
        console.error('Database error:', error);
        await interaction.reply(`Sorry, there was an error retrieving the history.`);
    }
};
exports.execute = execute;
