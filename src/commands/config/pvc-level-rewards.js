const Discord = require("discord.js");
const pvcConfig = require("../../database/models/pvcConfig");

module.exports = async (client, interaction, args) => {
  const rewardType = interaction.options.getString("type");
  const amount = interaction.options.getInteger("amount");

  if (amount < 0) {
    return client.errNormal(
      {
        error: "Reward amount cannot be negative!",
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

    // Map reward type to config field
    const fieldMap = {
      base: "BaseLevelReward",
      milestone10: "Milestone10",
      milestone50: "Milestone50",
      milestone100: "Milestone100",
    };

    const fieldName = fieldMap[rewardType];
    config[fieldName] = amount;
    await config.save();

    // Create display name for embed
    const displayNames = {
      base: "Base Reward (Every Level)",
      milestone10: "Milestone Bonus (Levels 10, 20, 30...)",
      milestone50: "Milestone Bonus (Level 50)",
      milestone100: "Milestone Bonus (Levels 100, 200...)",
    };

    return client.succNormal(
      {
        text: `Level-up reward has been updated!`,
        fields: [
          {
            name: "📊 Reward Type",
            value: displayNames[rewardType],
            inline: false,
          },
          {
            name: "🪙 Amount",
            value: `${amount.toLocaleString()} coins`,
            inline: true,
          },
        ],
        type: "editreply",
      },
      interaction
    );
  } catch (err) {
    console.error("Error in pvc-level-rewards config:", err);
    return client.errNormal(
      {
        error: "An error occurred while updating configuration!",
        type: "editreply",
      },
      interaction
    );
  }
};
