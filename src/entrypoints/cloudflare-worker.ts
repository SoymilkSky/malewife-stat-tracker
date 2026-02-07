// Cloudflare Worker entry point for Discord bot
// Minimal implementation without Discord.js dependencies

import {
  type Env,
  InteractionType,
  InteractionResponseType,
  verifySignature,
  handleTrackCommand,
  handleWhoisCommand,
  handleLeaderboardCommand,
  handleHistoryCommand,
} from '../worker-commands';

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
