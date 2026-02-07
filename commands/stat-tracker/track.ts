import { SlashCommandBuilder } from 'discord.js';
import { addUserPoints } from '../../database';
import { statChoices, operationChoices } from '../../utils';

export const data = new SlashCommandBuilder()
  .setName('track')
  .setDescription('adds or subtracts a stat for a user')
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription('the user to track')
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName('stat')
      .setDescription('the stat to track')
      .setRequired(true)
      .addChoices(...statChoices),
  )
  .addStringOption((option) =>
    option
      .setName('operation')
      .setDescription('the operation to perform on the stat')
      .setRequired(true)
      .addChoices(...operationChoices),
  )
  .addIntegerOption((option) =>
    option
      .setName('amount')
      .setDescription('the amount to track')
      .setMinValue(1)
      .setMaxValue(10)
      .setRequired(true),
  );

export const execute = async (interaction: any) => {
  const stat = interaction.options.getString('stat');
  const operation = interaction.options.getString('operation');
  const amount = interaction.options.getInteger('amount');
  const user = interaction.options.getUser('user');
  const commandIssuer = interaction.user;

  if (user.id === commandIssuer.id) {
    await interaction.reply('You cannot track stats for yourself!');
    return;
  }

  try {
    const finalAmount = operation === 'add' ? amount : -amount;
    const reason = `${operation === 'add' ? 'Added' : 'Subtracted'} by ${commandIssuer.username}`;

    await addUserPoints(user.id, commandIssuer.id, stat, finalAmount, reason);

    await interaction.reply(
      `${commandIssuer} has ${operation === 'add' ? 'added' : 'subtracted'} ${amount} ${stat} points for ${user}!`,
    );
  } catch (error) {
    console.error('Database error:', error);
    await interaction.reply(`Sorry, there was an error updating the stats.`);
  }
};
