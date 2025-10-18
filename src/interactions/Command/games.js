const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("games")
    .setDescription("Play a game!")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("would-you-rather")
        .setDescription("Play a game of Would You Rather!")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("truth-or-dare")
        .setDescription("Play a game of Truth or Dare!")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("never-have-i-ever")
        .setDescription("Play a game of Never Have I Ever!")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("20-questions")
        .setDescription("Play a game of 20 Questions!")
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "would-you-rather") {
      await interaction.reply(
        "Would you rather... be able to fly or be invisible?"
      );
    } else if (subcommand === "truth-or-dare") {
      await interaction.reply("Truth or dare?");
    } else if (subcommand === "never-have-i-ever") {
      await interaction.reply(
        "Never have I ever... eaten a whole pizza by myself."
      );
    } else if (subcommand === "20-questions") {
      await interaction.reply(
        "Think of something! I will try to guess it in 20 questions."
      );
    }
  },
};
