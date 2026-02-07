// History command for Cloudflare Worker

import type { Env, WorkerCommandHandler } from './types';
import { getUserPointHistoryWorker } from '../database/worker-database';
import { getStatEmoji } from '../utils/utils';

export const handleHistoryCommand: WorkerCommandHandler = async (
  interaction: any,
  env: Env,
) => {
  const userOption = interaction.data.options?.find(
    (opt: any) => opt.name === 'user',
  );
  const category = interaction.data.options?.find(
    (opt: any) => opt.name === 'category',
  )?.value;
  const limit = Math.min(
    interaction.data.options?.find((opt: any) => opt.name === 'limit')?.value ||
      10,
    25,
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
    const history = await getUserPointHistoryWorker(
      env.DB,
      userId,
      category,
      limit,
    );

    if (history.length === 0) {
      const filterText = category ? ` for ${category}` : '';
      return {
        embeds: [
          {
            title: category
              ? `📜 ${category.charAt(0).toUpperCase() + category.slice(1)} History`
              : '📜 Point History',
            description: `**User:** <@${userId}>\n\n<@${userId}> has no transaction history${filterText}!`,
            color: 0x9932cc,
          },
        ],
      };
    }

    const title = category
      ? `📜 ${category.charAt(0).toUpperCase() + category.slice(1)} History`
      : '📜 Point History';
    const embedDescription = category
      ? `**User:** <@${userId}>\n\nShowing recent ${category} transactions`
      : `**User:** <@${userId}>\n\nShowing ${history.length} most recent transactions`;

    // Build transaction list
    let transactionList = '';
    history.forEach((transaction: any) => {
      const emoji = getStatEmoji(transaction.category_name);
      const sign = transaction.amount >= 0 ? '+' : '';
      const dateTime = new Date(transaction.created_at).toLocaleString();
      const giverText =
        transaction.giver_id === 'system'
          ? 'System'
          : `<@${transaction.giver_id}>`;

      transactionList += `${emoji} **${sign}${transaction.amount}** ${transaction.category_name}\n`;
      transactionList += `   From: ${giverText} • ${dateTime}\n`;
      if (transaction.reason) {
        transactionList += `   *${transaction.reason}*\n`;
      }
      transactionList += '\n';
    });

    return {
      embeds: [
        {
          title,
          description: embedDescription,
          color: 0x9932cc,
          timestamp: new Date().toISOString(),
          fields: [
            {
              name: 'Recent Transactions',
              value: transactionList || 'No transactions found',
              inline: false,
            },
          ],
        },
      ],
    };
  } catch (error) {
    console.error('Error in history command:', error);
    return {
      embeds: [
        {
          title: '❌ Error',
          description: 'Sorry, there was an error retrieving the history.',
          color: 0xff0000,
        },
      ],
      flags: 64,
    };
  }
};
