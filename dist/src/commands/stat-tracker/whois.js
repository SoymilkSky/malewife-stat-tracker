"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute = exports.data = void 0;
const discord_js_1 = require("discord.js");
const database_1 = require("../../database/database");
const utils_1 = require("../../utils/utils");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('whois')
    .setDescription('Display stats for a user')
    .addUserOption((option) => option
    .setName('user')
    .setDescription('The user to check stats for')
    .setRequired(true));
const execute = async (interaction) => {
    const user = interaction.options.getUser('user');
    try {
        const statsResult = await (0, database_1.getUserStats)(user.id);
        const stats = statsResult.results || [];
        if (stats.length === 0) {
            await interaction.reply(`${user.username} has no tracked stats yet!`);
            return;
        }
        const embed = new discord_js_1.EmbedBuilder()
            .setTitle(`📊 Stats for ${user.username}`)
            .setThumbnail(user.displayAvatarURL())
            .setColor(0x0099ff)
            .setTimestamp();
        // Build description from new schema
        let description = '';
        stats.forEach((stat) => {
            const emoji = (0, utils_1.getStatEmoji)(stat.category_name);
            description += `${emoji} **${stat.category_name.charAt(0).toUpperCase() + stat.category_name.slice(1)}**: ${stat.points}\n`;
        });
        embed.setDescription(description || 'No stats available.');
        await interaction.reply({ embeds: [embed] });
    }
    catch (error) {
        console.error('Database error:', error);
        await interaction.reply(`Sorry, there was an error retrieving the stats`);
    }
};
exports.execute = execute;
