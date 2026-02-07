import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('user')
  .setDescription('Replies with user info!');

export const execute = async (interaction: any) => {
  await interaction.reply(
    `This command was run by ${interaction.user.username}, who joined on ${interaction.member.joinedAt}.`,
  );
};
