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
