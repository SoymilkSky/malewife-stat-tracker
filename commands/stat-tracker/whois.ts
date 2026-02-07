import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getUserStats } from '../../database';
import { getStatEmoji } from '../../utils';

export const data = new SlashCommandBuilder()
  .setName('whois')
  .setDescription('Display stats for a user')
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription('The user to check stats for')
      .setRequired(true),
  );

export const execute = async (interaction: any) => {
  const user = interaction.options.getUser('user');

  try {
    const statsResult = await getUserStats(user.id);
    const stats = statsResult.results || [];

    if (stats.length === 0) {
      await interaction.reply(`${user.username} has no tracked stats yet!`);
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`📊 Stats for ${user.username}`)
      .setThumbnail(user.displayAvatarURL())
      .setColor(0x0099ff)
      .setTimestamp();

    // Build description from new schema
    let description = '';
    stats.forEach((stat: any) => {
      const emoji = getStatEmoji(stat.category_name);
      description += `${emoji} **${stat.category_name.charAt(0).toUpperCase() + stat.category_name.slice(1)}**: ${stat.points}\n`;
    });

    embed.setDescription(description || 'No stats available.');

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Database error:', error);
    await interaction.reply(`Sorry, there was an error retrieving the stats`);
  }
};
