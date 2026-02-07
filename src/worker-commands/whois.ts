// Whois command for Cloudflare Worker

import type { Env, WorkerCommandHandler } from './types';
import { getUserStatsWorker } from '../database/worker-database';
import { getStatEmoji } from '../utils/utils';

export const handleWhoisCommand: WorkerCommandHandler = async (
  interaction: any,
  env: Env,
) => {
  const userOption = interaction.data.options?.find(
    (opt: any) => opt.name === 'user',
  );
  if (!userOption) {
    return {
      embeds: [
        {
          title: '❌ Error',
          description: 'User parameter required!',
          color: 0xff0000,
        },
      ],
      flags: 64,
    };
  }

  const userId = userOption.value;

  try {
    const stats = await getUserStatsWorker(env.DB, userId);

    if (stats.length === 0) {
      return {
        embeds: [
          {
            title: '📊 User Stats',
            description: `<@${userId}> has no tracked stats yet!`,
            color: 0x0099ff,
          },
        ],
      };
    }

    let description = `**User:** <@${userId}>\n\n`;
    for (const stat of stats) {
      const categoryName = String(stat.category_name);
      const emoji = getStatEmoji(categoryName);
      description += `${emoji} **${categoryName.charAt(0).toUpperCase() + categoryName.slice(1)}**: ${stat.points}\n`;
    }

    return {
      embeds: [
        {
          title: '📊 User Stats',
          description: description || 'No stats available.',
          color: 0x0099ff,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  } catch (error) {
    console.error('Error in whois command:', error);
    return {
      embeds: [
        {
          title: '❌ Error',
          description: 'Sorry, there was an error retrieving the stats.',
          color: 0xff0000,
        },
      ],
      flags: 64,
    };
  }
};
