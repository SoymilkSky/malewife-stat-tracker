# Stat Bot 📊

A Discord bot for tracking and displaying user statistics with a fun twist! Track various personality traits and achievements among server members using slash commands.

## Features

- **Stat Tracking**: Track 6 different categories: malewife, manipulate, mansplain, gaslight, gatekeep, and girlboss
- **Leaderboards**: View top users overall or by specific category
- **User Profiles**: Check individual user stats and transaction history
- **Transaction History**: See detailed point history with reasons and timestamps
- **Slash Commands**: Modern Discord slash command interface
- **Cloud Database**: Powered by Cloudflare D1 for reliable data storage
- **Multiple Hosting Options**: Traditional Discord bot or serverless Cloudflare Worker

## Project Structure

```
stat-bot/
├── src/
│   ├── entrypoints/              # Different hosting entry points
│   │   ├── discord-bot.ts        # Traditional Discord gateway bot
│   │   └── cloudflare-worker.ts  # Cloudflare Worker webhook handler
│   ├── database/                 # Database connection and operations
│   │   └── database.ts           # Database interface and functions
│   ├── utils/                    # Shared utilities
│   │   └── utils.ts              # Helper functions and constants
│   └── commands/                 # Discord slash commands
│       └── stat-tracker/         # Stat tracking commands
│           ├── track.ts
│           ├── whois.ts
│           ├── leaderboard.ts
│           └── history.ts
├── scripts/                      # Build and deployment scripts
│   └── deploy-commands.ts        # Discord command registration
├── dist/                         # Compiled output (created on build)
└── config files...               # package.json, tsconfig.json, etc.
```

## Commands

| Command        | Description                             | Usage                                               |
| -------------- | --------------------------------------- | --------------------------------------------------- |
| `/track`       | Add or subtract points for a user       | `/track @user stat:malewife operation:add amount:1` |
| `/whois`       | Display all stats for a user            | `/whois @user`                                      |
| `/leaderboard` | Show top users (overall or by category) | `/leaderboard category:malewife limit:10`           |
| `/history`     | View point transaction history          | `/history @user category:malewife limit:20`         |
| `/ping`        | Test bot responsiveness                 | `/ping`                                             |
| `/user`        | Get basic user info                     | `/user`                                             |

## Setup

### Prerequisites

- Node.js 18+
- Discord Developer Application
- Cloudflare account with D1 database

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd stat-bot
   npm install
   ```

2. **Create Discord Application**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create a new application and bot
   - Copy the bot token, client ID, and your server's guild ID

3. **Set up Cloudflare D1**
   - Create a D1 database in your Cloudflare dashboard
   - Generate API token with D1 permissions
   - Note your account ID and database ID

4. **Configure Environment Variables**

   Create a `.env` file for local development:

   ```bash
   cp .env.example .env
   ```

   **For Traditional Bot (.env file):**

   ```env
   # Discord Configuration
   DISCORD_TOKEN=your_discord_bot_token
   DISCORD_CLIENT_ID=your_discord_client_id
   DISCORD_GUILD_ID=your_server_guild_id

   # Cloudflare Configuration (for database access)
   CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
   CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
   CLOUDFLARE_DATABASE_ID=your_d1_database_id
   ```

   **For Cloudflare Worker (wrangler.toml [vars] section):**

   ```toml
   [vars]
   DISCORD_APPLICATION_ID = "your_discord_application_id"
   DISCORD_PUBLIC_KEY = "your_discord_public_key"
   DISCORD_TOKEN = "your_discord_bot_token"
   ```

   **Where to find these values:**
   - **Application ID**: Discord Developer Portal > General Information
   - **Public Key**: Discord Developer Portal > General Information (**NOT** the bot token!)
   - **Bot Token**: Discord Developer Portal > Bot > Token

   ```bash
   npm run init-db
   ```

5. **Deploy Commands**

   ```bash
   npm run build
   npm run deploy-commands
   ```

## Running the Bot

### Option 1: Traditional Discord Bot (Gateway)

Perfect for development and smaller deployments:

```bash
npm run dev
```

### Option 2: Cloudflare Worker (Webhooks)

Serverless, scales automatically, recommended for production:

```bash
# Initial setup - configure wrangler.toml with your Discord credentials
npm run build
npm run worker:deploy
```

Your worker will be deployed to: `https://stat-bot.YOUR-SUBDOMAIN.workers.dev`

**⚠️ Important**: After deployment, you must configure Discord to use your Worker URL:

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application → **General Information**
3. Set **Interactions Endpoint URL** to your Worker URL
4. Discord will verify the endpoint - it must respond correctly or be rejected

**Note**: For Cloudflare Worker hosting, you need to configure the Discord webhook URL in your Discord Developer Portal to point to your Worker endpoint.

## Deployment

### Cloudflare Worker Setup (Recommended)

1. **Configure wrangler.toml**

   ```toml
   [vars]
   DISCORD_APPLICATION_ID = "your_application_id"
   DISCORD_PUBLIC_KEY = "your_public_key"
   DISCORD_TOKEN = "your_bot_token"
   ```

2. **Deploy Worker**

   ```bash
   npm run build
   npm run worker:deploy
   ```

3. bash

# Development

npm run dev # Run traditional Discord bot
npm run build # Compile TypeScript to dist/

# Database

npm run init-db # Initialize database tables (traditional hosting)

# Discord Commands

npm run deploy-commands # Register slash commands with Discord

# Cloudflare Worker

npm run worker:dev # Test worker locally (with wrangler dev)
npm run worker:deploy # Deploy worker to production

# Utilities

npm audit # Security audit

```

### File Structure Notes

- **dist/**: Compiled JavaScript output (ignored by git)
- **src/entrypoints/**: Different hosting entry points
- **src/database/**: Database functions (traditional) and worker-database functions (Cloudflare)
- **wrangler.toml**: Cloudflare Worker configuration with environment variables
   npm run deploy-commands  # Register slash commands with Discord
```

### Traditional Bot Deployment

1. **Set up environment variables** in your hosting platform
2. **Build and run**:
   ```bash
   npm run build
   npm run dev  # or use PM2 for production
   ```

### Important Notes

- **Never run both hosting methods simultaneously** - choose one
- **Worker requires webhook setup** in Discord Developer Portal
- **Traditional bot requires always-on server** but simpler setup
- **Commands must be deployed** with `npm run deploy-commands` after changes

## Database Schema

The bot uses a normalized database structure:

- **users**: Stores Discord user IDs with internal user_id
- **point_categories**: Available stat categories
- **user_points**: Current point totals per user/category
- **point_transactions**: Complete history of all point changes

## Hosting Options

### Traditional Bot Hosting

- **Entry Point**: [src/entrypoints/discord-bot.ts](src/entrypoints/discord-bot.ts)
- **Connection**: Discord Gateway (WebSocket)
- **Scaling**: Manual server management
- **Best For**: Development, small servers, always-on hosting

### Cloudflare Worker Hosting (Recommended)

- **Entry Point**: [src/entrypoints/cloudflare-worker.ts](src/entrypoints/cloudflare-worker.ts)
- **Connection**: Discord Webhooks (HTTP)
- **Scaling**: Automatic, serverless
- **Best For**: Production, high availability, cost efficiency
- **Live Example**: Successfully deployed at `https://stat-bot.danny-96-wong.workers.dev`

## Development

Available npm scripts:

````bash
# Development
npm run dev              # Run traditional Discord bot
npm run build           # Compile TypeScript to dist/

# Database
np Configuration

### Stat Categories

Default categories are: `malewife`, `manipulate`, `mansplain`, `gaslight`, `gatekeep`, `girlboss`

To modify categories, update the `categories` array in [src/database/database.ts](src/database/database.ts) and run the database initialization.

### Permissions

Currently, any server member can track stats for others. Consider implementing role-based permissions for production use.

### Environment Variables

The bot requires different environment variables depending on hosting method:

**Both hosting methods:**
- `DISCORD_TOKEN` - Bot token from Discord Developer Portal
- `DISCORD_CLIENT_ID` - Application ID from Discord Developer Portal
- `DISCORD_GUILD_ID` - Your Discord server ID
- Database configuration via `wrangler.toml`

**Cloudflare Worker only:**
- `DISCORD_APPLICATION_ID` - Same as client ID (for webhooks)
- `DISCORD_PUBLIC_KEY` - For webhook signature verification
- ✅ Environment variable isolation
- ✅ Self-action prevention (users can't modify their own stats)
- ✅ Input validation through Discord's slash command system
- ✅ HTTPS communication with Cloudflare APIs

## Development

```bash
# Run in development mode
npm run dev

# Build TypeScript
npm run build

# Test database connection
npm run test-db

# Run security audit
npm audit

# Deploy commands to Discord
npx tsx deploy-commands.ts
````

## Configuration

### Stat Categories

DefSecurity Features

- ✅ SQL injection protection via parameterized queries
- ✅ Environment variable isolation
- ✅ Self-action prevention (users can't modify their own stats)
- ✅ Input validation through Discord's slash command system
- ✅ HTTPS communication with Cloudflare APIs
- ✅ Webhook signature verification (Cloudflare Worker hosting)

## Troubleshooting

### Common Issues

**Build Errors**: Ensure all import paths are correct after the reorganization
**Command Registration**: Run `npm run deploy-commands` after any command changes  
**Database Issues**: Verify your D1 database configuration in `wrangler.toml`
**Worker Deployment**: Ensure webhook URL is configured in Discord Developer Portal

### Support

- Check the console logs for detailed error messages
- Ensure all environment variables are correctly formatted
- Verify Discord bot permissions include "Use Slash Commands"
- Test database connectivity with `npm run ini
  MIT License - see LICENSE file for details

## Support

- Check the console logs for detailed error messages
- Ensure all environment variables are correctly formatted
- Verify Discord bot permissions include "Use Slash Commands"
- Test database connectivity with `npm run test-db`

## Acknowledgments

Built with:

- [Discord.js](https://discord.js.org/) - Discord API wrapper
- [Cloudflare D1](https://developers.cloudflare.com/d1/) - Serverless SQL database
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
  License
