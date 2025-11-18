const Discord = require("discord.js");
const pvcEconomy = require("../../database/models/pvcEconomy");
const pvcConfig = require("../../database/models/pvcConfig");
const voiceChannels = require("../../database/models/voiceChannels");

module.exports = async (client, message, args) => {
  if (message.author.bot) return;

  try {
    const config = await pvcConfig.findOne({ Guild: message.guild.id });
    if (!config || !config.CommandsChannel) return;
    if (message.channel.id !== config.CommandsChannel) return;

    // Get user's active VC
    const vcData = await voiceChannels.findOne({
      Guild: message.guild.id,
      Owner: message.author.id,
    });

    if (!vcData) {
      const embed = new Discord.EmbedBuilder()
        .setColor(client.config.colors.error || "#FF0000")
        .setTitle("❌ No Active VC")
        .setDescription(
          "You don't have an active voice channel!\n\nUse `!create <duration>` to create one."
        )
        .setFooter({
          text: message.guild.name,
          iconURL: message.guild.iconURL(),
        });

      return message.reply({ embeds: [embed] }).then((msg) => {
        setTimeout(() => msg.delete().catch(() => {}), 5000);
      });
    }

    // Parse duration
    if (!args[1]) {
      const embed = new Discord.EmbedBuilder()
        .setColor(client.config.colors.error || "#FF0000")
        .setTitle("❌ Invalid Usage")
        .setDescription(
          `**Usage**: \`!extend <duration>\`\n\n` +
            `**Examples**: \`!extend 30min\`, \`!extend 1hr\`, \`!extend 2hrs\``
        )
        .setFooter({
          text: message.guild.name,
          iconURL: message.guild.iconURL(),
        });

      return message.reply({ embeds: [embed] }).then((msg) => {
        setTimeout(() => msg.delete().catch(() => {}), 5000);
      });
    }

    // Parse duration
    const durationArg = args[1].toLowerCase();
    let durationMinutes = 0;

    if (durationArg.includes("hr") || durationArg.includes("hour")) {
      const hours = parseFloat(durationArg.replace(/[^0-9.]/g, ""));
      durationMinutes = hours * 60;
    } else if (durationArg.includes("min") || durationArg.includes("m")) {
      durationMinutes = parseInt(durationArg.replace(/[^0-9]/g, ""));
    } else {
      const embed = new Discord.EmbedBuilder()
        .setColor(client.config.colors.error || "#FF0000")
        .setTitle("❌ Invalid Duration Format")
        .setDescription("**Examples**: `30min`, `1hr`, `2hrs`, `1.5hr`")
        .setFooter({
          text: message.guild.name,
          iconURL: message.guild.iconURL(),
        });

      return message.reply({ embeds: [embed] }).then((msg) => {
        setTimeout(() => msg.delete().catch(() => {}), 5000);
      });
    }

    if (durationMinutes < config.MinimumDuration) {
      const embed = new Discord.EmbedBuilder()
        .setColor(client.config.colors.error || "#FF0000")
        .setTitle("❌ Duration Too Short")
        .setDescription(
          `Minimum duration is **${config.MinimumDuration} minutes**!`
        )
        .setFooter({
          text: message.guild.name,
          iconURL: message.guild.iconURL(),
        });

      return message.reply({ embeds: [embed] }).then((msg) => {
        setTimeout(() => msg.delete().catch(() => {}), 5000);
      });
    }

    // Calculate cost
    const cost = Math.ceil((durationMinutes / 60) * config.HourlyPrice);

    // Get user balance
    let userData = await pvcEconomy.findOne({
      Guild: message.guild.id,
      User: message.author.id,
    });

    if (!userData || userData.Coins < cost) {
      const embed = new Discord.EmbedBuilder()
        .setColor(client.config.colors.error || "#FF0000")
        .setTitle("❌ Insufficient Balance")
        .setDescription(
          `**Cost**: ${cost.toLocaleString()} coins\n` +
            `**Your Balance**: ${
              userData ? userData.Coins.toLocaleString() : 0
            } coins\n` +
            `**Needed**: ${(
              cost - (userData?.Coins || 0)
            ).toLocaleString()} more coins`
        )
        .setFooter({
          text: message.guild.name,
          iconURL: message.guild.iconURL(),
        });

      return message.reply({ embeds: [embed] }).then((msg) => {
        setTimeout(() => msg.delete().catch(() => {}), 10000);
      });
    }

    // Deduct coins
    userData.Coins -= cost;
    userData.TotalSpent += cost;
    await userData.save();

    // Update VC data
    vcData.CoinsSpent += cost;

    if (vcData.IsPAYG) {
      // Convert from PAYG to Paid
      vcData.IsPAYG = false;
      vcData.ExpiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
      vcData.PaidDuration = durationMinutes;
    } else {
      // Extend existing paid VC
      const currentExpiry = vcData.ExpiresAt || new Date();
      vcData.ExpiresAt = new Date(
        currentExpiry.getTime() + durationMinutes * 60 * 1000
      );
      vcData.PaidDuration += durationMinutes;
    }

    await vcData.save();

    const embed = new Discord.EmbedBuilder()
      .setColor(client.config.colors.success || "#00FF00")
      .setTitle("✅ VC Time Extended!")
      .setDescription(`Your voice channel has been extended!`)
      .addFields(
        { name: "⏱️ Added", value: `${durationMinutes} minutes`, inline: true },
        {
          name: "💰 Cost",
          value: `${cost.toLocaleString()} coins`,
          inline: true,
        },
        {
          name: "🏦 Remaining Balance",
          value: `${userData.Coins.toLocaleString()} coins`,
          inline: true,
        },
        {
          name: "⏰ New Expiry",
          value: `<t:${Math.floor(vcData.ExpiresAt.getTime() / 1000)}:R>`,
          inline: false,
        }
      )
      .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL() })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  } catch (err) {
    console.error("Error in PVC extend command:", err);
    message
      .reply("❌ An error occurred while extending your VC.")
      .catch(() => {});
  }
};
