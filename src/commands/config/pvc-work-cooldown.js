const Discord = require("discord.js");
const pvcConfig = require("../../database/models/pvcConfig");

module.exports = async (client, interaction, args) => {
  const minutes = interaction.options.getInteger("minutes");
  const ms = minutes * 60 * 1000;

  try {
    let config = await pvcConfig.findOne({ Guild: interaction.guild.id });
    if (!config) {
      config = await new pvcConfig({ Guild: interaction.guild.id }).save();
    }

    config.WorkCooldown = ms;
    await config.save();

    return client.succNormal(
      {
        text: `Work cooldown has been set to **${minutes} minute(s)**!`,
        type: "editreply",
      },
      interaction
    );
  } catch (err) {
    console.error("Error in pvc-work-cooldown config:", err);
    return client.errNormal(
      {
        error: "An error occurred while updating configuration!",
        type: "editreply",
      },
      interaction
    );
  }
};
