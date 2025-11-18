const Discord = require("discord.js");
const pvcConfig = require("../../database/models/pvcConfig");

module.exports = async (client, interaction, args) => {
  const minimum = interaction.options.getInteger("minimum");
  const maximum = interaction.options.getInteger("maximum");

  if (minimum > maximum) {
    return client.errNormal(
      {
        error: "Minimum cannot be greater than maximum!",
        type: "editreply",
      },
      interaction
    );
  }

  try {
    let config = await pvcConfig.findOne({ Guild: interaction.guild.id });
    if (!config) {
      config = await new pvcConfig({ Guild: interaction.guild.id }).save();
    }

    config.WorkMin = minimum;
    config.WorkMax = maximum;
    await config.save();

    return client.succNormal(
      {
        text: `Work rewards have been updated!`,
        fields: [
          {
            name: "📊 Minimum",
            value: `${minimum.toLocaleString()} coins`,
            inline: true,
          },
          {
            name: "📊 Maximum",
            value: `${maximum.toLocaleString()} coins`,
            inline: true,
          },
        ],
        type: "editreply",
      },
      interaction
    );
  } catch (err) {
    console.error("Error in pvc-work-rewards config:", err);
    return client.errNormal(
      {
        error: "An error occurred while updating configuration!",
        type: "editreply",
      },
      interaction
    );
  }
};
