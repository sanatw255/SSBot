const Discord = require("discord.js");
const pvcConfig = require("../../database/models/pvcConfig");

module.exports = async (client, interaction, args) => {
  try {
    let config = await pvcConfig.findOne({ Guild: interaction.guild.id });
    if (!config) {
      config = await new pvcConfig({ Guild: interaction.guild.id }).save();
    }

    const economyChannel = config.EconomyChannel
      ? `<#${config.EconomyChannel}>`
      : "Not configured";
    const commandsChannel = config.CommandsChannel
      ? `<#${config.CommandsChannel}>`
      : "Not configured";
    const workCooldownMin = Math.floor(config.WorkCooldown / 60000);

    const embed = new Discord.EmbedBuilder()
      .setTitle("⚙️ PVC Configuration")
      .setColor(client.config.colors.normal)
      .addFields(
        { name: "💬 Economy Channel", value: economyChannel, inline: true },
        { name: "🔧 Commands Channel", value: commandsChannel, inline: true },
        { name: "\u200b", value: "\u200b", inline: false },
        {
          name: "💰 Hourly Price",
          value: `${config.HourlyPrice.toLocaleString()} coins`,
          inline: true,
        },
        {
          name: "⏱️ PAYG (Per Minute)",
          value: `${config.PAYGPerMinute} coins`,
          inline: true,
        },
        {
          name: "⏰ Work Cooldown",
          value: `${workCooldownMin} minutes`,
          inline: true,
        },
        {
          name: "📊 Work Rewards",
          value: `${config.WorkMin.toLocaleString()} - ${config.WorkMax.toLocaleString()} coins`,
          inline: true,
        },
        {
          name: "🎁 Daily Rewards",
          value: `${config.DailyMin.toLocaleString()} - ${config.DailyMax.toLocaleString()} coins`,
          inline: true,
        },
        {
          name: "🎖️ Level Rewards",
          value: config.LevelRewardsEnabled ? "Enabled ✅" : "Disabled ❌",
          inline: true,
        },
        {
          name: "🪙 Base Level Reward",
          value: `${config.BaseLevelReward.toLocaleString()} coins`,
          inline: true,
        },
        {
          name: "🎉 Milestone 10 Bonus",
          value: `+${config.Milestone10.toLocaleString()} coins`,
          inline: true,
        },
        {
          name: "🎉 Milestone 50 Bonus",
          value: `+${config.Milestone50.toLocaleString()} coins`,
          inline: true,
        },
        {
          name: "🎉 Milestone 100 Bonus",
          value: `+${config.Milestone100.toLocaleString()} coins`,
          inline: true,
        }
      )
      .setFooter({
        text: interaction.guild.name,
        iconURL: interaction.guild.iconURL(),
      })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error("Error in pvc-view config:", err);
    return client.errNormal(
      {
        error: "An error occurred while fetching configuration!",
        type: "editreply",
      },
      interaction
    );
  }
};
