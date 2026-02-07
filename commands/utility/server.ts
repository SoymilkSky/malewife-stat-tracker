import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('server')
  .setDescription('Replies with server info!');

export const execute = async (interaction: any) => {
  await interaction.reply(
    `Server name: ${interaction.guild.name}\nTotal members: ${interaction.guild.memberCount}`,
  );
};
