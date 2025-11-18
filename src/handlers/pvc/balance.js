const Discord = require("discord.js");
const pvcEconomy = require("../../database/models/pvcEconomy");
const pvcConfig = require("../../database/models/pvcConfig");

module.exports = async (client, message, args) => {
  // Ignore bots
  if (message.author.bot) return;

  try {
    // Check if PVC economy is configured
    const config = await pvcConfig.findOne({ Guild: message.guild.id });

    if (!config || !config.EconomyChannel) {
      return; // Silently ignore if not configured
    }

    // Check if command is in the correct channel
    if (message.channel.id !== config.EconomyChannel) {
      return; // Silently ignore if wrong channel
    }

    // Check if user specified someone else
    let targetUser = message.author;
    if (message.mentions.users.size > 0) {
      targetUser = message.mentions.users.first();
    }

    // Get or create user economy data
    let userData = await pvcEconomy.findOne({
      Guild: message.guild.id,
      User: targetUser.id,
    });

    if (!userData) {
      userData = await new pvcEconomy({
        Guild: message.guild.id,
        User: targetUser.id,
        Coins: 0,
      }).save();
    }

    // Create balance embed
    const embed = new Discord.EmbedBuilder()
      .setColor(client.config.colors.normal || "#2F3136")
      .setAuthor({
        name: `${targetUser.username}'s PVC Balance`,
        iconURL: targetUser.displayAvatarURL({ dynamic: true }),
      })
      .setDescription(
        `💰 **Current Balance**: **${userData.Coins.toLocaleString()}** coins`
      )
      .addFields(
        {
          name: "📊 Total Earned",
          value: `${userData.TotalEarned.toLocaleString()} coins`,
          inline: true,
        },
        {
          name: "💸 Total Spent",
          value: `${userData.TotalSpent.toLocaleString()} coins`,
          inline: true,
        },
        {
          name: "🎁 Total Gifted",
          value: `${userData.TotalGifted.toLocaleString()} coins`,
          inline: true,
        },
        {
          name: "📥 Total Received",
          value: `${userData.TotalReceived.toLocaleString()} coins`,
          inline: true,
        }
      )
      .setFooter({
        text: `💎 ${Math.floor(
          userData.Coins / config.HourlyPrice
        )} hours of VC time available`,
        iconURL: message.guild.iconURL(),
      })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  } catch (err) {
    console.error("Error in PVC balance command:", err);
    message
      .reply("❌ An error occurred while fetching balance.")
      .catch(() => {});
  }
};
