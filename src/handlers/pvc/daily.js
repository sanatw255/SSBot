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

    // Get or create user economy data
    let userData = await pvcEconomy.findOne({
      Guild: message.guild.id,
      User: message.author.id,
    });

    if (!userData) {
      userData = await new pvcEconomy({
        Guild: message.guild.id,
        User: message.author.id,
        Coins: 0,
      }).save();
    }

    // Check cooldown (24 hours)
    const dailyCooldown = 86400000; // 24 hours in ms
    if (userData.LastDaily) {
      const timeSinceLastDaily = Date.now() - userData.LastDaily.getTime();
      if (timeSinceLastDaily < dailyCooldown) {
        const timeLeft = Math.ceil((dailyCooldown - timeSinceLastDaily) / 1000);
        const hours = Math.floor(timeLeft / 3600);
        const minutes = Math.floor((timeLeft % 3600) / 60);

        const embed = new Discord.EmbedBuilder()
          .setColor(client.config.colors.error || "#FF0000")
          .setTitle("⏰ Daily Cooldown Active")
          .setDescription(
            `You've already claimed your daily reward!\n\nCome back in **${hours}h ${minutes}m**`
          )
          .setFooter({
            text: message.guild.name,
            iconURL: message.guild.iconURL(),
          })
          .setTimestamp();

        return message.reply({ embeds: [embed] }).then((msg) => {
          setTimeout(() => msg.delete().catch(() => {}), 5000);
        });
      }
    }

    // Generate random daily amount
    const amount = Math.floor(
      Math.random() * (config.DailyMax - config.DailyMin + 1) + config.DailyMin
    );

    // Update user data
    userData.Coins += amount;
    userData.TotalEarned += amount;
    userData.LastDaily = new Date();
    await userData.save();

    // Calculate streak (future feature, for now just show daily)
    const embed = new Discord.EmbedBuilder()
      .setColor(client.config.colors.success || "#00FF00")
      .setTitle("🎁 Daily Reward Claimed!")
      .setDescription(`You've collected your daily coins!`)
      .addFields(
        {
          name: "💰 Earned",
          value: `**${amount.toLocaleString()}** coins`,
          inline: true,
        },
        {
          name: "🏦 New Balance",
          value: `**${userData.Coins.toLocaleString()}** coins`,
          inline: true,
        }
      )
      .setFooter({
        text: "Come back tomorrow for more!",
        iconURL: message.guild.iconURL(),
      })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  } catch (err) {
    console.error("Error in PVC daily command:", err);
    message
      .reply("❌ An error occurred while processing your daily reward.")
      .catch(() => {});
  }
};
