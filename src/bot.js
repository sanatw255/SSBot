const Discord = require("discord.js");
const fs = require("fs");

// Discord client
const client = new Discord.Client({
  allowedMentions: {
    parse: ["users", "roles"],
    repliedUser: true,
  },
  autoReconnect: true,
  disabledEvents: ["TYPING_START"],
  partials: [
    Discord.Partials.Channel,
    Discord.Partials.GuildMember,
    Discord.Partials.Message,
    Discord.Partials.Reaction,
    Discord.Partials.User,
    Discord.Partials.GuildScheduledEvent,
  ],
  intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMembers,
    Discord.GatewayIntentBits.GuildBans,
    Discord.GatewayIntentBits.GuildEmojisAndStickers,
    Discord.GatewayIntentBits.GuildIntegrations,
    Discord.GatewayIntentBits.GuildWebhooks,
    Discord.GatewayIntentBits.GuildInvites,
    Discord.GatewayIntentBits.GuildVoiceStates,
    Discord.GatewayIntentBits.GuildMessages,
    Discord.GatewayIntentBits.GuildMessageReactions,
    Discord.GatewayIntentBits.GuildMessageTyping,
    Discord.GatewayIntentBits.DirectMessages,
    Discord.GatewayIntentBits.DirectMessageReactions,
    Discord.GatewayIntentBits.DirectMessageTyping,
    Discord.GatewayIntentBits.GuildScheduledEvents,
    Discord.GatewayIntentBits.MessageContent,
  ],
  restTimeOffset: 0,
});

// Connect to database
require("./database/connect")();

// Client settings
client.config = require("./config/bot");
client.changelogs = require("./config/changelogs");
client.emotes = require("./config/emojis.json");
client.webhooks = require("./config/webhooks.json");

const webHooksArray = [
  "startLogs",
  "shardLogs",
  "errorLogs",
  "dmLogs",
  "voiceLogs",
  "serverLogs",
  "serverLogs2",
  "commandLogs",
  "consoleLogs",
  "warnLogs",
  "voiceErrorLogs",
  "creditLogs",
  "evalLogs",
  "interactionLogs",
];

// If WEBHOOK_ID and WEBHOOK_TOKEN are set in .env, override webhook config
if (process.env.WEBHOOK_ID && process.env.WEBHOOK_TOKEN) {
  for (const webhookName of webHooksArray) {
    client.webhooks[webhookName].id = process.env.WEBHOOK_ID;
    client.webhooks[webhookName].token = process.env.WEBHOOK_TOKEN;
  }
}

client.commands = new Discord.Collection();
client.playerManager = new Map();
client.queue = new Map();

// Webhooks
const consoleLogs = new Discord.WebhookClient({
  id: client.webhooks.consoleLogs.id,
  token: client.webhooks.consoleLogs.token,
});

const warnLogs = new Discord.WebhookClient({
  id: client.webhooks.warnLogs.id,
  token: client.webhooks.warnLogs.token,
});

// ✅ SAFE HANDLER LOADER (fixes .DS_Store and non-directory issues)
fs.readdirSync("./src/handlers")
  .filter(
    (dir) =>
      !dir.startsWith(".") &&
      fs.lstatSync(`./src/handlers/${dir}`).isDirectory()
  )
  .forEach((dir) => {
    fs.readdirSync(`./src/handlers/${dir}`)
      .filter((file) => file.endsWith(".js"))
      .forEach((handler) => {
        require(`./handlers/${dir}/${handler}`)(client);
      });
  });

// Login
client.login(process.env.DISCORD_TOKEN);

// Global unhandled rejection handler
process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
  if (error)
    if (error.length > 950)
      error = error.slice(0, 950) + "... view console for details";
  if (error.stack)
    if (error.stack.length > 950)
      error.stack = error.stack.slice(0, 950) + "... view console for details";
  if (!error.stack) return;
  const embed = new Discord.EmbedBuilder()
    .setTitle(`🚨・Unhandled promise rejection`)
    .addFields([
      {
        name: "Error",
        value: error ? Discord.codeBlock(error) : "No error",
      },
      {
        name: "Stack error",
        value: error.stack ? Discord.codeBlock(error.stack) : "No stack error",
      },
    ])
    .setColor(client.config.colors.normal);
  consoleLogs
    .send({
      username: "Bot Logs",
      embeds: [embed],
    })
    .catch(() => {
      console.log("Error sending unhandledRejection to webhook");
      console.log(error);
    });
});

// Global warning handler
process.on("warning", (warn) => {
  console.warn("Warning:", warn);
  const embed = new Discord.EmbedBuilder()
    .setTitle(`🚨・New warning found`)
    .addFields([
      {
        name: `Warn`,
        value: `\`\`\`${warn}\`\`\``,
      },
    ])
    .setColor(client.config.colors.normal);
  warnLogs
    .send({
      username: "Bot Logs",
      embeds: [embed],
    })
    .catch(() => {
      console.log("Error sending warning to webhook");
      console.log(warn);
    });
});

// WebSocket error logging
client.on(Discord.ShardEvents.Error, (error) => {
  console.log(error);
  if (error)
    if (error.length > 950)
      error = error.slice(0, 950) + "... view console for details";
  if (error.stack)
    if (error.stack.length > 950)
      error.stack = error.stack.slice(0, 950) + "... view console for details";
  if (!error.stack) return;
  const embed = new Discord.EmbedBuilder()
    .setTitle(`🚨・A websocket connection encountered an error`)
    .addFields([
      {
        name: `Error`,
        value: `\`\`\`${error}\`\`\``,
      },
      {
        name: `Stack error`,
        value: `\`\`\`${error.stack}\`\`\``,
      },
    ])
    .setColor(client.config.colors.normal);
  consoleLogs.send({
    username: "Bot Logs",
    embeds: [embed],
  });
});
