import { Client, Collection, Events, GatewayIntentBits } from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
}) as any;

client.once(Events.ClientReady, async (readyClient: any) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
  console.log('Connected to Cloudflare D1 database!');

  // Note: Tables already exist in Cloudflare dashboard
  // To initialize tables for new hosting, uncomment the line below:
  // await initializeDatabase();
});

client.login(process.env.DISCORD_TOKEN);

client.commands = new Collection();

const foldersPath = path.join(__dirname, '..', 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith('.ts'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
    } else {
      console.log(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
      );
    }
  }
}

client.on(Events.InteractionCreate, async (intersection: any) => {
  if (!intersection.isChatInputCommand()) return;

  const command = client.commands.get(intersection.commandName);

  if (!command) {
    console.error(`No command matching ${intersection.commandName} was found.`);
    return;
  }

  try {
    await command.execute(intersection);
  } catch (error) {
    console.error(error);

    if (intersection.replied || intersection.deferred) {
      await intersection.followUp({
        content: 'There was an error while executing this command!',
        ephemeral: true,
      });
    } else {
      await intersection.reply({
        content: 'There was an error while executing this command!',
        ephemeral: true,
      });
    }
  }
});
