"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute = exports.data = void 0;
const discord_js_1 = require("discord.js");
const database_1 = require("../../database/database");
const utils_1 = require("../../utils/utils");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the top users by points')
    .addStringOption((option) => option
    .setName('category')
    .setDescription('Show leaderboard for specific category (optional)')
    .setRequired(false)
    .addChoices(...utils_1.statChoices))
    .addIntegerOption((option) => option
    .setName('limit')
    .setDescription('Number of top users to show (default: 10, max: 20)')
    .setMinValue(1)
    .setMaxValue(20)
    .setRequired(false));
const execute = async (interaction) => {
    const category = interaction.options.getString('category');
    const limit = interaction.options.getInteger('limit') || 10;
    try {
        const leaderboardResult = await (0, database_1.getTopUsers)(category, limit);
        const leaderboard = leaderboardResult.results || [];
        if (leaderboard.length === 0) {
            const filterText = category ? ` for ${category}` : '';
            await interaction.reply(`No users found${filterText}!`);
            return;
        }
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle(`🏆 Leaderboard${category ? ` - ${category.charAt(0).toUpperCase() + category.slice(1)}` : ''}`)
            .setColor(0xffd700)
            .setTimestamp();
        let description = '';
        // Fetch usernames for each user ID
        for (let index = 0; index < leaderboard.length; index++) {
            const entry = leaderboard[index];
            const rank = index + 1;
            const medal = (0, utils_1.getRankMedal)(rank);
            const emoji = (0, utils_1.getStatEmoji)(entry.category_name);
            try {
                const user = await interaction.client.users.fetch(entry.user_id);
                const username = user.username;
                if (category) {
                    description += `${medal} **#${rank}** ${username} - ${entry.points} points\n`;
                }
                else {
                    description += `${medal} **#${rank}** ${username} - ${entry.points} ${emoji} ${entry.category_name}\n`;
                }
            }
            catch (error) {
                // User account deleted or not found - use mention as fallback
                if (category) {
                    description += `${medal} **#${rank}** <@${entry.user_id}> - ${entry.points} points\n`;
                }
                else {
                    description += `${medal} **#${rank}** <@${entry.user_id}> - ${entry.points} ${emoji} ${entry.category_name}\n`;
                }
            }
        }
        embed.setDescription(description);
        await interaction.reply({ embeds: [embed] });
    }
    catch (error) {
        console.error('Database error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await interaction.reply(`Sorry, there was an error retrieving the leaderboard: ${errorMessage}`);
    }
};
exports.execute = execute;
