// Leaderboard command for Cloudflare Worker

import type { Env, WorkerCommandHandler } from './types';
import { getTopUsersWorker } from '../database/worker-database';
import { getStatEmoji, getRankMedal } from '../utils/utils';

export const handleLeaderboardCommand: WorkerCommandHandler = async (
  interaction: any,
  env: Env,
) => {
  const category = interaction.data.options?.find(
    (opt: any) => opt.name === 'category',
  )?.value;
  const limit = Math.min(
    interaction.data.options?.find((opt: any) => opt.name === 'limit')?.value ||
      10,
    25,
  );

  try {
    const users = await getTopUsersWorker(env.DB, category, limit);

    if (users.length === 0) {
      const filterText = category ? ` for ${category}` : '';
      return {
        embeds: [
          {
            title: '🏆 Leaderboard',
            description: `No users found${filterText}!`,
            color: 0xffd700,
          },
        ],
      };
    }

    let description = '';
    users.forEach((user: any, index: number) => {
      const rank = index + 1;
      const medal = getRankMedal(rank);
      const emoji = getStatEmoji(user.category_name);

      if (category) {
        description += `${medal} **#${rank}** <@${user.user_id}> - ${user.points} points\n`;
      } else {
        description += `${medal} **#${rank}** <@${user.user_id}> - ${user.points} ${emoji} ${user.category_name}\n`;
      }
    });

    const title = category
      ? `🏆 ${category.charAt(0).toUpperCase() + category.slice(1)} Leaderboard`
      : '🏆 Overall Leaderboard';

    return {
      embeds: [
        {
          title,
          description: description || 'No users found!',
          color: 0xffd700,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  } catch (error) {
    console.error('Error in leaderboard command:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return {
      embeds: [
        {
          title: '❌ Error',
          description: `Sorry, there was an error retrieving the leaderboard: ${errorMessage}`,
          color: 0xff0000,
        },
      ],
      flags: 64,
    };
  }
};
