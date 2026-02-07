// Cloudflare Worker entry point for Discord bot
// Minimal implementation without Discord.js dependencies

// Define the environment interface for Cloudflare Worker
export interface Env {
  DISCORD_APPLICATION_ID: string;
  DISCORD_PUBLIC_KEY: string;
  DISCORD_TOKEN: string;
  DB: D1Database;
}

// Discord interaction types
const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
  MESSAGE_COMPONENT: 3,
  APPLICATION_COMMAND_AUTOCOMPLETE: 4,
  MODAL_SUBMIT: 5,
} as const;

const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
  DEFERRED_UPDATE_MESSAGE: 6,
  UPDATE_MESSAGE: 7,
} as const;

// Import Worker-specific database functions
import {
  addUserPointsWorker,
  getUserStatsWorker,
  getTopUsersWorker,
  getUserPointHistoryWorker,
} from '../database/worker-database';
import { getStatEmoji, getRankMedal } from '../utils/utils';

// Verify Discord signature using Web Crypto API
async function verifySignature(request: Request, env: Env): Promise<boolean> {
  const signature = request.headers.get('X-Signature-Ed25519');
  const timestamp = request.headers.get('X-Signature-Timestamp');

  if (!signature || !timestamp) {
    return false;
  }

  const body = await request.clone().text();
  const message = timestamp + body;

  try {
    // Convert hex string to Uint8Array for Web Crypto API
    const keyBytes = new Uint8Array(
      env.DISCORD_PUBLIC_KEY.match(/.{1,2}/g)!.map((byte) =>
        parseInt(byte, 16),
      ),
    );
    const signatureBytes = new Uint8Array(
      signature.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)),
    );

    const key = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      {
        name: 'Ed25519',
        namedCurve: 'Ed25519',
      },
      false,
      ['verify'],
    );

    const isValid = await crypto.subtle.verify(
      'Ed25519',
      key,
      signatureBytes,
      new TextEncoder().encode(message),
    );
    return isValid;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

// Command handlers - implemented directly without Discord.js dependencies
const handleTrackCommand = async (interaction: any, env: Env) => {
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

const handleWhoisCommand = async (interaction: any, env: Env) => {
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

const handleLeaderboardCommand = async (interaction: any, env: Env) => {
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

const handleHistoryCommand = async (interaction: any, env: Env) => {
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

// Main worker export - this MUST be a default export for Cloudflare Workers
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Only handle POST requests to the webhook endpoint
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Verify Discord signature
    const isValid = await verifySignature(request, env);
    if (!isValid) {
      return new Response('Unauthorized', { status: 401 });
    }

    const interaction = (await request.json()) as any;

    // Handle PING
    if (interaction.type === InteractionType.PING) {
      return new Response(
        JSON.stringify({
          type: InteractionResponseType.PONG,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    // Handle APPLICATION_COMMAND
    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      try {
        let responseData;

        switch (interaction.data.name) {
          case 'track':
            responseData = await handleTrackCommand(interaction, env);
            break;
          case 'whois':
            responseData = await handleWhoisCommand(interaction, env);
            break;
          case 'leaderboard':
            responseData = await handleLeaderboardCommand(interaction, env);
            break;
          case 'history':
            responseData = await handleHistoryCommand(interaction, env);
            break;
          default:
            responseData = {
              embeds: [
                {
                  title: '❌ Error',
                  description: `Unknown command: ${interaction.data.name}`,
                  color: 0xff0000,
                },
              ],
              flags: 64, // Ephemeral
            };
        }

        return new Response(
          JSON.stringify({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: responseData,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          },
        );
      } catch (error) {
        console.error('Command execution error:', error);

        return new Response(
          JSON.stringify({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              embeds: [
                {
                  title: '❌ Error',
                  description:
                    'There was an error while executing this command!',
                  color: 0xff0000,
                },
              ],
              flags: 64, // Ephemeral
            },
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }
    }

    return new Response('Bad request', { status: 400 });
  },
};
