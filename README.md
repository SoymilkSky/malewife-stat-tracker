# Stat Bot 📊

A Discord bot for tracking and displaying user statistics with a fun twist! Track various personality traits and achievements among server members using slash commands.

## Features

- **Stat Tracking**: Track 6 different categories: malewife, manipulate, mansplain, gaslight, gatekeep, and girlboss
- **Leaderboards**: View top users overall or by specific category
- **User Profiles**: Check individual user stats and transaction history
- **Transaction History**: See detailed point history with reasons and timestamps
- **Slash Commands**: Modern Discord slash command interface
- **Cloud Database**: Powered by Cloudflare D1 for reliable data storage

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

   ```bash
   cp .env.example .env
   ```

   Fill in your `.env` file:

   ```env
   # Discord Configuration
   DISCORD_TOKEN=your_discord_bot_token
   DISCORD_CLIENT_ID=your_discord_client_id
   DISCORD_GUILD_ID=your_server_guild_id

   # Cloudflare Configuration
   CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
   CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
   CLOUDFLARE_DATABASE_ID=your_d1_database_id
   ```

5. **Initialize Database**

   ```bash
   npm run init-db
   ```

6. **Deploy Commands**

   ```bash
   npm run build
   npx tsx deploy-commands.ts
   ```

7. **Start the Bot**
   ```bash
   npm run dev
   ```

## Database Schema

The bot uses a normalized database structure:

- **users**: Stores Discord user IDs with internal user_id
- **point_categories**: Available stat categories
- **user_points**: Current point totals per user/category
- **point_transactions**: Complete history of all point changes

## Deployment

### Cloudflare Workers (Recommended)

1. Configure `wrangler.toml` with your database binding
2. Deploy using Wrangler:
   ```bash
   wrangler publish
   ```

### Traditional VPS/Server

1. Build the project: `npm run build`
2. Use a process manager like PM2
3. Ensure environment variables are set

## Security Features

- ✅ SQL injection protection via parameterized queries
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
```

## Configuration

### Stat Categories

Default categories are: `malewife`, `manipulate`, `mansplain`, `gaslight`, `gatekeep`, `girlboss`

To modify categories, update the `categories` array in [database.ts](database.ts) and run the database initialization.

### Permissions

Currently, any server member can track stats for others. Consider implementing role-based permissions for production use.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Run `npm audit` to check for security issues
4. Test your changes thoroughly
5. Submit a pull request

## License

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
