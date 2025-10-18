/*
This script:
1. Checks if "config" command exists globally
2. Checks if "levelchannels" subcommand is in it
3. If missing, creates/patches it
4. Force-registers to a dev guild for instant testing

ENV:
- DISCORD_TOKEN (required)
- CLIENT_ID (required - your bot's application ID)
- GUILD_ID (optional but highly recommended for instant testing)
*/
require("dotenv").config();
const {
  REST,
  Routes,
  SlashCommandBuilder,
  ChannelType,
} = require("discord.js");

async function main() {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID;
  const guildId = process.env.GUILD_ID;

  if (!token || !clientId) {
    console.error(
      "❌ Missing env vars. Add to .env:\n  DISCORD_TOKEN=your_bot_token\n  CLIENT_ID=your_application_id\n  GUILD_ID=your_dev_guild_id (optional)"
    );
    process.exit(1);
  }

  console.log(`[1/4] Connecting to Discord API...`);
  const rest = new REST({ version: "10" }).setToken(token);

  try {
    // Step 1: Check global commands
    console.log(`[2/4] Checking global commands...`);
    const globalCmds = await rest.get(Routes.applicationCommands(clientId));
    const configCmd = globalCmds.find((c) => c.name === "config");

    if (!configCmd) {
      console.warn(`⚠️  Global "config" command not found. Creating fresh...`);
      const newConfig = new SlashCommandBuilder()
        .setName("config")
        .setDescription("Server configuration")
        .addSubcommand((sub) =>
          sub
            .setName("levelchannels")
            .setDescription("Manage which channels award XP/levels")
            .addStringOption((opt) =>
              opt
                .setName("action")
                .setDescription("Action: add | remove | list | clear")
                .setRequired(true)
                .addChoices(
                  { name: "add", value: "add" },
                  { name: "remove", value: "remove" },
                  { name: "list", value: "list" },
                  { name: "clear", value: "clear" }
                )
            )
            .addChannelOption((opt) =>
              opt
                .setName("channel")
                .setDescription("Channel (required for add/remove)")
                .addChannelTypes(
                  ChannelType.GuildText,
                  ChannelType.PublicThread,
                  ChannelType.PrivateThread,
                  ChannelType.AnnouncementThread
                )
            )
        );

      await rest.post(Routes.applicationCommands(clientId), {
        body: newConfig.toJSON(),
      });
      console.log(`✅ Created global "config" with "levelchannels"`);
    } else {
      const hasLC = configCmd.options?.some(
        (o) => o.type === 1 && o.name === "levelchannels"
      );
      if (!hasLC) {
        console.warn(
          `⚠️  "levelchannels" subcommand missing from global "config". Adding...`
        );
        const options = Array.isArray(configCmd.options)
          ? [...configCmd.options]
          : [];
        options.push({
          type: 1,
          name: "levelchannels",
          description: "Manage which channels award XP/levels",
          options: [
            {
              type: 3,
              name: "action",
              description: "Action: add | remove | list | clear",
              required: true,
              choices: [
                { name: "add", value: "add" },
                { name: "remove", value: "remove" },
                { name: "list", value: "list" },
                { name: "clear", value: "clear" },
              ],
            },
            {
              type: 7,
              name: "channel",
              description: "Channel (required for add/remove)",
              channel_types: [0, 10, 11, 12],
            },
          ],
        });

        await rest.patch(Routes.applicationCommand(clientId, configCmd.id), {
          body: {
            name: configCmd.name,
            description: configCmd.description || "Server configuration",
            options,
          },
        });
        console.log(`✅ Patched global "config" with "levelchannels"`);
      } else {
        console.log(`✅ Global "config" already has "levelchannels"`);
      }
    }

    // Step 2: If guild provided, also register there for instant testing
    if (guildId) {
      console.log(
        `[3/4] Registering to dev guild ${guildId} for instant testing...`
      );
      try {
        const guildCmds = await rest.get(
          Routes.applicationGuildCommands(clientId, guildId)
        );
        const guildConfig = guildCmds.find((c) => c.name === "config");

        if (!guildConfig) {
          console.log(`  Creating "config" in guild...`);
          const newConfig = new SlashCommandBuilder()
            .setName("config")
            .setDescription("Server configuration")
            .addSubcommand((sub) =>
              sub
                .setName("levelchannels")
                .setDescription("Manage which channels award XP/levels")
                .addStringOption((opt) =>
                  opt
                    .setName("action")
                    .setDescription("Action: add | remove | list | clear")
                    .setRequired(true)
                    .addChoices(
                      { name: "add", value: "add" },
                      { name: "remove", value: "remove" },
                      { name: "list", value: "list" },
                      { name: "clear", value: "clear" }
                    )
                )
                .addChannelOption((opt) =>
                  opt
                    .setName("channel")
                    .setDescription("Channel (required for add/remove)")
                    .addChannelTypes(
                      ChannelType.GuildText,
                      ChannelType.PublicThread,
                      ChannelType.PrivateThread,
                      ChannelType.AnnouncementThread
                    )
                )
            );

          await rest.post(Routes.applicationGuildCommands(clientId, guildId), {
            body: newConfig.toJSON(),
          });
          console.log(`  ✅ Created "config" in guild (instant)`);
        } else {
          const hasLC = guildConfig.options?.some(
            (o) => o.type === 1 && o.name === "levelchannels"
          );
          if (!hasLC) {
            console.log(`  Patching "config" in guild...`);
            const options = Array.isArray(guildConfig.options)
              ? [...guildConfig.options]
              : [];
            options.push({
              type: 1,
              name: "levelchannels",
              description: "Manage which channels award XP/levels",
              options: [
                {
                  type: 3,
                  name: "action",
                  description: "Action: add | remove | list | clear",
                  required: true,
                  choices: [
                    { name: "add", value: "add" },
                    { name: "remove", value: "remove" },
                    { name: "list", value: "list" },
                    { name: "clear", value: "clear" },
                  ],
                },
                {
                  type: 7,
                  name: "channel",
                  description: "Channel (required for add/remove)",
                  channel_types: [0, 10, 11, 12],
                },
              ],
            });

            await rest.patch(
              Routes.applicationGuildCommand(clientId, guildId, guildConfig.id),
              {
                body: {
                  name: guildConfig.name,
                  description:
                    guildConfig.description || "Server configuration",
                  options,
                },
              }
            );
            console.log(`  ✅ Patched "config" in guild (instant)`);
          } else {
            console.log(`  ✅ Guild "config" already has "levelchannels"`);
          }
        }
      } catch (e) {
        console.warn(
          `  ⚠️  Guild registration failed (non-critical):`,
          e?.message
        );
      }
    }

    console.log(`[4/4] Done!`);
    console.log(``);
    console.log(`📝 Summary:`);
    console.log(`  ✅ Global "config" command updated`);
    if (guildId) {
      console.log(
        `  ✅ Guild "config" command updated (instant, use for testing)`
      );
    } else {
      console.log(`  ⏳ Global commands take up to 1 hour to appear`);
      console.log(
        `  💡 Tip: Add GUILD_ID=your_dev_guild to .env for instant guild testing`
      );
    }
    console.log(``);
    console.log(`Next steps:`);
    console.log(`  1. Restart your bot: node src/index.js`);
    console.log(`  2. Go to Discord and type: /config levelchannels`);
    console.log(`  3. Should see the subcommand appear now`);
  } catch (e) {
    console.error("❌ Error:", e?.message || e);
    process.exit(1);
  }
}

main();
