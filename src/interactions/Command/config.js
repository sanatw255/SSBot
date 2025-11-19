const { CommandInteraction, Client } = require("discord.js");
const { SlashCommandBuilder } = require("discord.js");
const { ChannelType } = require("discord.js");
const Discord = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("Adjust the bot to your taste")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("help")
        .setDescription("Get information about the config category commands")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("levels")
        .setDescription("Enable/disable levels")
        .addBooleanOption((option) =>
          option
            .setName("boolean")
            .setDescription("Select a boolean")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("levelchannels")
        .setDescription("Manage channels where XP is earned")
        .addStringOption((option) =>
          option
            .setName("action")
            .setDescription("Action to perform")
            .setRequired(true)
            .addChoices(
              { name: "Add Channel", value: "add" },
              { name: "Remove Channel", value: "remove" },
              { name: "List Channels", value: "list" },
              { name: "Clear All (allow all channels)", value: "clear" }
            )
        )
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Channel to add/remove (not needed for list/clear)")
            .addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("levelexcludedroles")
        .setDescription("Manage roles/users that won't gain XP")
        .addStringOption((option) =>
          option
            .setName("action")
            .setDescription("Action to perform")
            .setRequired(true)
            .addChoices(
              { name: "Add", value: "add" },
              { name: "Remove", value: "remove" },
              { name: "List", value: "list" },
              { name: "Clear All", value: "clear" }
            )
        )
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("Type to add/remove (not needed for list/clear)")
            .addChoices(
              { name: "Role", value: "role" },
              { name: "User", value: "user" }
            )
        )
        .addRoleOption((option) =>
          option.setName("role").setDescription("Role to exclude/include")
        )
        .addUserOption((option) =>
          option.setName("user").setDescription("User to exclude/include")
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("voicexp")
        .setDescription("Configure voice channel XP settings")
        .addStringOption((option) =>
          option
            .setName("setting")
            .setDescription("Setting to configure")
            .setRequired(true)
            .addChoices(
              { name: "Enable/Disable", value: "enabled" },
              { name: "XP Amount", value: "xpamount" },
              { name: "Interval (minutes)", value: "interval" },
              { name: "AFK Detection", value: "afkdetection" },
              { name: "Minimum Users", value: "minimumusers" },
              { name: "View Settings", value: "view" }
            )
        )
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("Value for XP amount, interval, or minimum users")
            .setMinValue(1)
            .setMaxValue(60)
        )
        .addBooleanOption((option) =>
          option
            .setName("enabled")
            .setDescription("Value for enabled or AFK detection (true/false)")
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("voicexpchannels")
        .setDescription("Manage voice channels/categories that grant XP")
        .addStringOption((option) =>
          option
            .setName("action")
            .setDescription("Action to perform")
            .setRequired(true)
            .addChoices(
              { name: "Add Channel/Category", value: "add" },
              { name: "Remove Channel/Category", value: "remove" },
              { name: "List Channels", value: "list" },
              { name: "Clear All (allow all VCs)", value: "clear" }
            )
        )
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription(
              "Voice channel or category (not needed for list/clear)"
            )
            .addChannelTypes(
              Discord.ChannelType.GuildVoice,
              Discord.ChannelType.GuildCategory
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("setcolor")
        .setDescription("Set a custom embed color")
        .addStringOption((option) =>
          option
            .setName("color")
            .setDescription("Enter a hex color")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("setverify")
        .setDescription("Setup the verify panel")
        .addBooleanOption((option) =>
          option
            .setName("enable")
            .setDescription("Select a boolean")
            .setRequired(true)
        )
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Select a channel")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
        .addRoleOption((option) =>
          option
            .setName("role")
            .setDescription("Select a role")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("setchannelname")
        .setDescription("Set a custom channel name for server stats")
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription(
              "Enter a name for the channel or send HELP for the args"
            )
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("levelmessage")
        .setDescription("Set the bot level message")
        .addStringOption((option) =>
          option
            .setName("message")
            .setDescription(
              "Enter a message for the levels or send HELP for the args"
            )
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("welcomemessage")
        .setDescription("Set the welcome message")
        .addStringOption((option) =>
          option
            .setName("message")
            .setDescription("Enter a welcome message or send HELP for the args")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("leavemessage")
        .setDescription("Set the leave message")
        .addStringOption((option) =>
          option
            .setName("message")
            .setDescription("Enter a leave message or send HELP for the args")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("ticketmessage")
        .setDescription("Set the ticket message of the bot")
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("Ticket message type")
            .setRequired(true)
            .addChoices(
              { name: "open", value: "open" },
              { name: "closeDM", value: "close" }
            )
        )
        .addStringOption((option) =>
          option
            .setName("message")
            .setDescription("Enter a message for the ticket")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("pvc-economy-channel")
        .setDescription(
          "Set the channel where PVC economy commands work (!work, !daily, !bal, !give)"
        )
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("The channel for PVC economy commands")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("pvc-commands-channel")
        .setDescription(
          "Set the channel where PVC management commands work (!create, !extend, !rename, etc.)"
        )
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("The channel for PVC management commands")
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("pvc-work-cooldown")
        .setDescription("Set the cooldown for !work command (in minutes)")
        .addIntegerOption((option) =>
          option
            .setName("minutes")
            .setDescription("Cooldown in minutes (1-60)")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(60)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("pvc-pricing")
        .setDescription("Set the price for 1 hour of VC time")
        .addIntegerOption((option) =>
          option
            .setName("coins")
            .setDescription("Coins per hour (minimum 1000)")
            .setRequired(true)
            .setMinValue(1000)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("pvc-work-rewards")
        .setDescription("Set min/max rewards for !work command")
        .addIntegerOption((option) =>
          option
            .setName("minimum")
            .setDescription("Minimum coins earned")
            .setRequired(true)
            .setMinValue(100)
        )
        .addIntegerOption((option) =>
          option
            .setName("maximum")
            .setDescription("Maximum coins earned")
            .setRequired(true)
            .setMinValue(100)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("pvc-daily-rewards")
        .setDescription("Set min/max rewards for !daily command")
        .addIntegerOption((option) =>
          option
            .setName("minimum")
            .setDescription("Minimum coins earned")
            .setRequired(true)
            .setMinValue(100)
        )
        .addIntegerOption((option) =>
          option
            .setName("maximum")
            .setDescription("Maximum coins earned")
            .setRequired(true)
            .setMinValue(100)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("pvc-level-rewards")
        .setDescription("Set PVC coin rewards for leveling up")
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("Type of level reward")
            .setRequired(true)
            .addChoices(
              { name: "Base Reward (Every Level)", value: "base" },
              {
                name: "Milestone 10 (Levels 10, 20, 30, 40, 60, 70, 80, 90...)",
                value: "milestone10",
              },
              { name: "Milestone 50 (Level 50)", value: "milestone50" },
              {
                name: "Milestone 100 (Levels 100, 200...)",
                value: "milestone100",
              }
            )
        )
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("Coins to award")
            .setRequired(true)
            .setMinValue(0)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("pvc-view")
        .setDescription("View current PVC configuration")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("pvc-panel")
        .setDescription("Setup the PVC control panel in a channel")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription(
              "The channel where the control panel will be posted"
            )
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
    ),
  /**
   * @param {Client} client
   * @param {CommandInteraction} interaction
   * @param {String[]} args
   */

  run: async (client, interaction, args) => {
    await interaction.deferReply({ withResponse: true });
    client.loadSubcommands(client, interaction, args);
  },
};
