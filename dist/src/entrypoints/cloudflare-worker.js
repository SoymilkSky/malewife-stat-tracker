"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// Cloudflare Worker entry point for Discord bot
const discord_js_1 = require("discord.js");
// Discord interaction types
const InteractionType = {
    PING: 1,
    APPLICATION_COMMAND: 2,
    MESSAGE_COMPONENT: 3,
    APPLICATION_COMMAND_AUTOCOMPLETE: 4,
    MODAL_SUBMIT: 5,
};
const InteractionResponseType = {
    PONG: 1,
    CHANNEL_MESSAGE_WITH_SOURCE: 4,
    DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
    DEFERRED_UPDATE_MESSAGE: 6,
    UPDATE_MESSAGE: 7,
};
// Load commands
const commands = new discord_js_1.Collection();
// In a Cloudflare Worker, we need to load commands differently since there's no filesystem access
// Commands will need to be imported directly
const trackCommand = __importStar(require("../commands/stat-tracker/track"));
const whoisCommand = __importStar(require("../commands/stat-tracker/whois"));
const leaderboardCommand = __importStar(require("../commands/stat-tracker/leaderboard"));
const historyCommand = __importStar(require("../commands/stat-tracker/history"));
// Register commands with type safety
const commandModules = [trackCommand, whoisCommand, leaderboardCommand, historyCommand];
commandModules.forEach(cmd => {
    if ('data' in cmd && 'execute' in cmd) {
        commands.set(cmd.data.name, cmd);
    }
});
// Verify Discord signature
async function verifySignature(request, env) {
    const signature = request.headers.get('X-Signature-Ed25519');
    const timestamp = request.headers.get('X-Signature-Timestamp');
    if (!signature || !timestamp) {
        return false;
    }
    const body = await request.clone().text();
    const message = timestamp + body;
    // Use Web Crypto API available in Cloudflare Workers
    try {
        const key = await crypto.subtle.importKey('raw', Buffer.from(env.DISCORD_PUBLIC_KEY, 'hex'), {
            name: 'Ed25519',
            namedCurve: 'Ed25519'
        }, false, ['verify']);
        const isValid = await crypto.subtle.verify('Ed25519', key, Buffer.from(signature, 'hex'), new TextEncoder().encode(message));
        return isValid;
    }
    catch {
        return false;
    }
}
exports.default = {
    async fetch(request, env) {
        // Only handle POST requests to the webhook endpoint
        if (request.method !== 'POST') {
            return new Response('Method not allowed', { status: 405 });
        }
        // Verify Discord signature
        const isValid = await verifySignature(request, env);
        if (!isValid) {
            return new Response('Unauthorized', { status: 401 });
        }
        const interaction = await request.json();
        // Handle PING
        if (interaction.type === InteractionType.PING) {
            return new Response(JSON.stringify({
                type: InteractionResponseType.PONG
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
        // Handle APPLICATION_COMMAND
        if (interaction.type === InteractionType.APPLICATION_COMMAND) {
            const command = commands.get(interaction.data.name);
            if (!command) {
                return new Response(JSON.stringify({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: 'Command not found!',
                        flags: 64 // Ephemeral
                    }
                }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            try {
                // Create a mock interaction object that matches what commands expect
                const mockInteraction = {
                    ...interaction,
                    reply: (response) => response,
                    followUp: (response) => response,
                    deferReply: () => null,
                    editReply: (response) => response,
                    user: interaction.member?.user || interaction.user,
                    guild: { id: interaction.guild_id },
                    options: {
                        get: (name) => {
                            const option = interaction.data.options?.find((opt) => opt.name === name);
                            return option ? { value: option.value, user: option.user, member: option.member } : null;
                        },
                        getString: (name) => {
                            const option = interaction.data.options?.find((opt) => opt.name === name);
                            return option?.value;
                        },
                        getInteger: (name) => {
                            const option = interaction.data.options?.find((opt) => opt.name === name);
                            return option?.value;
                        },
                        getUser: (name) => {
                            const option = interaction.data.options?.find((opt) => opt.name === name);
                            return option?.user;
                        }
                    },
                    replied: false,
                    deferred: false
                };
                const result = await command.execute(mockInteraction);
                // If the command returns a response, use it
                if (result) {
                    return new Response(JSON.stringify({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: result
                    }), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
                // Default success response
                return new Response(JSON.stringify({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: 'Command executed successfully!',
                        flags: 64 // Ephemeral
                    }
                }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            catch (error) {
                console.error('Command execution error:', error);
                return new Response(JSON.stringify({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: 'There was an error while executing this command!',
                        flags: 64 // Ephemeral
                    }
                }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }
        return new Response('Bad request', { status: 400 });
    }
};
