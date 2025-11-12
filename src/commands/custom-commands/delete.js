const Discord = require("discord.js");
const Schema = require("../../database/models/customCommandAdvanced");

module.exports = async (client, interaction, args) => {
  const cmdname = interaction.options.getString("command");

  try {
    const data = await Schema.findOne({
      Guild: interaction.guild.id,
      Name: cmdname.toLowerCase(),
    });
    console.log(data);

    if (data) {
      await Schema.findOneAndDelete({
        Guild: interaction.guild.id,
        Name: cmdname.toLowerCase(),
      });

      var commands = await interaction.guild.commands.fetch();
      var command = await commands.find(
        (cmd) => cmd.name == cmdname.toLowerCase()
      );
      if (!command)
        return client.errNormal(
          { error: "Unable to find this command!", type: "editreply" },
          interaction
        );
      await interaction.guild.commands.delete(command.id);

      client.succNormal(
        {
          text: `The command has been deleted successfully`,
          fields: [
            {
              name: "🔧┆Command",
              value: `\`\`\`${cmdname}\`\`\``,
              inline: true,
            },
          ],
          type: "editreply",
        },
        interaction
      );
    } else {
      client.errNormal(
        { error: "Unable to find this command!", type: "editreply" },
        interaction
      );
    }
  } catch (err) {
    console.error("Error in delete custom command:", err);
    client.errNormal(
      {
        error: "An error occurred while deleting the custom command.",
        type: "editreply",
      },
      interaction
    );
  }
};
