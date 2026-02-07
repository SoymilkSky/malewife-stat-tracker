# Instructions to get your Cloudflare credentials:

## 1. Get your API Token
- Go to https://dash.cloudflare.com/profile/api-tokens
- Click "Create Token"
- Use "Custom token" template
- Permissions: Zone:Zone:Read, Account:Cloudflare D1:Edit
- Copy the token

## 2. Get your Account ID  
- Go to https://dash.cloudflare.com/
- On the right sidebar, copy your Account ID

## 3. Get your Database ID
- Go to https://dash.cloudflare.com/ 
- Workers & Pages > D1 > your database name
- Copy the Database ID from the page

## Then create .env file:
CLOUDFLARE_API_TOKEN=your_token_here
CLOUDFLARE_ACCOUNT_ID=your_account_id_here  
CLOUDFLARE_DATABASE_ID=your_database_id_here

# Your existing Discord config
DISCORD_TOKEN=your_discord_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_GUILD_ID=your_guild_id