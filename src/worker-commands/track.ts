// Track command for Cloudflare Worker

import type { Env, WorkerCommandHandler } from './types';
import { addUserPointsWorker } from '../database/worker-database';
import { getStatEmoji } from '../utils/utils';

export const handleTrackCommand: WorkerCommandHandler = async (
  interaction: any,
  env: Env,
) => {
  const userOption = interaction.data.options?.find(
    (opt: any) => opt.name === 'user',
  );
  const stat = interaction.data.options?.find(
    (opt: any) => opt.name === 'stat',
  )?.value;
  const operation = interaction.data.options?.find(
    (opt: any) => opt.name === 'operation',
  )?.value;
  const amount =
    interaction.data.options?.find((opt: any) => opt.name === 'amount')
      ?.value || 1;

  if (!userOption || !stat || !operation) {
    return {
      embeds: [
        {
          title: '❌ Error',
          description: 'Missing required parameters!',
          color: 0xff0000,
        },
      ],
      flags: 64, // Ephemeral
    };
  }

  const userId = userOption.value;
  const points = operation === 'add' ? amount : -amount;
  const giverId =
    interaction.member?.user?.id || interaction.user?.id || 'system';
  const giverName =
    interaction.member?.user?.username ||
    interaction.user?.username ||
    'System';

  try {
    await addUserPointsWorker(
      env.DB,
      userId,
      giverId,
      stat,
      points,
      `${operation === 'add' ? 'Added' : 'Subtracted'} by ${giverName}`,
    );

    const actionText = operation === 'add' ? 'added' : 'subtracted';

    return {
      embeds: [
        {
          title: '✅ Stats Updated',
          description: `<@${giverId}> ${actionText} ${amount} ${getStatEmoji(stat)} ${stat} point${amount > 1 ? 's' : ''} ${operation === 'add' ? 'to' : 'from'} <@${userId}>`,
          color: 0x00ff00,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  } catch (error) {
    console.error('Error in track command:', error);
    return {
      embeds: [
        {
          title: '❌ Error',
          description: 'Failed to update stats. Please try again.',
          color: 0xff0000,
        },
      ],
      flags: 64,
    };
  }
};
