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
async function handleTrackCommand(interaction: any, env: Env) {
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
      content: 'Missing required parameters!',
      flags: 64, // Ephemeral
    };
  }

  const userId = userOption.value;
  const points = operation === 'add' ? amount : -amount;
  const giverId =
    interaction.member?.user?.id || interaction.user?.id || 'system';

  // Extract usernames from the interaction
  const receiverUsername = userOption.user?.username || userOption.user?.global_name;
  const giverUsername = interaction.member?.user?.username || interaction.user?.username || 
                       interaction.member?.user?.global_name || interaction.user?.global_name;

  try {
    await addUserPointsWorker(
      env.DB,
      userId,
      giverId,
      stat,
      points,
      `${operation} ${amount} by command`,
      receiverUsername,
      giverUsername
    );

    return {
      content: `Successfully ${operation === 'add' ? 'added' : 'subtracted'} ${amount} ${getStatEmoji(stat)} ${stat} points ${operation === 'add' ? 'to' : 'from'} <@${userId}>!`,
    };
  } catch (error) {
    console.error('Error in track command:', error);
    return {
      content: 'Failed to update stats. Please try again.',
      flags: 64,
    };
  }
}

async function handleWhoisCommand(interaction: any, env: Env) {
  const userOption = interaction.data.options?.find(
    (opt: any) => opt.name === 'user',
  );
  if (!userOption) {
    return { content: 'User parameter required!', flags: 64 };
  }

  const userId = userOption.value;

  try {
    const stats = await getUserStatsWorker(env.DB, userId);

    let description = '';
    for (const stat of stats) {
      const categoryName = String(stat.category_name);
      description += `${getStatEmoji(categoryName)} ${categoryName}: ${stat.points}\n`;
    }

    return {
      embeds: [
        {
          title: `📊 Stats for <@${userId}>`,
          description: description || 'No stats found!',
          color: 0x5865f2,
        },
      ],
    };
  } catch (error) {
    console.error('Error in whois command:', error);
    return {
      content: 'Failed to retrieve stats. Please try again.',
      flags: 64,
    };
  }
}

async function handleLeaderboardCommand(interaction: any, env: Env) {
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
    let description = '';
    users.forEach((user: any, index: number) => {
      const medal = getRankMedal(index + 1);
      // Display username if available, otherwise show Discord ID
      const displayName = user.username || `User ${user.user_id}`;
      description += `${medal} ${displayName}: ${user.points} points\n`;
    });

    const title = category
      ? `🏆 ${getStatEmoji(category)} ${category} Leaderboard`
      : '🏆 Overall Leaderboard';

    return {
      embeds: [
        {
          title,
          description: description || 'No users found!',
          color: 0xffd700,
        },
      ],
    };
  } catch (error) {
    console.error('Error in leaderboard command:', error);
    return {
      content: 'Failed to retrieve leaderboard. Please try again.',
      flags: 64,
    };
  }
}

async function handleHistoryCommand(interaction: any, env: Env) {
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
    return { content: 'User parameter required!', flags: 64 };
  }

  const userId = userOption.value;

  try {
    const history = await getUserPointHistoryWorker(
      env.DB,
      userId,
      category,
      limit,
    );
    let description = '';
    history.forEach((entry: any) => {
      const emoji = getStatEmoji(entry.category_name);
      const date = new Date(entry.created_at).toLocaleDateString();
      description += `${emoji} ${entry.category_name}: ${entry.amount > 0 ? '+' : ''}${entry.amount} - ${entry.reason || 'No reason'} (${date})\n`;
    });

    const title = category
      ? `📈 ${getStatEmoji(category)} ${category} History for <@${userId}>`
      : `📈 Point History for <@${userId}>`;

    return {
      embeds: [
        {
          title,
          description: description || 'No history found!',
          color: 0x00ff00,
        },
      ],
    };
  } catch (error) {
    console.error('Error in history command:', error);
    return {
      content: 'Failed to retrieve history. Please try again.',
      flags: 64,
    };
  }
}

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
              content: `Unknown command: ${interaction.data.name}`,
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
              content: 'There was an error while executing this command!',
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
