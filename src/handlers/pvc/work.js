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

    // Check cooldown
    if (userData.LastWork) {
      const timeSinceLastWork = Date.now() - userData.LastWork.getTime();
      if (timeSinceLastWork < config.WorkCooldown) {
        const timeLeft = Math.ceil(
          (config.WorkCooldown - timeSinceLastWork) / 1000
        );
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;

        const embed = new Discord.EmbedBuilder()
          .setColor(client.config.colors.error || "#FF0000")
          .setTitle("⏰ Cooldown Active")
          .setDescription(
            `You need to wait **${minutes}m ${seconds}s** before working again!`
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

    // Generate random work amount
    const amount = Math.floor(
      Math.random() * (config.WorkMax - config.WorkMin + 1) + config.WorkMin
    );

    const jobs = [
      "Programmer 💻",
      "Hacker 🖥️",
      "Content Creator 🎥",
      "Graphic Designer 🎨",
      "Discord Moderator 🛡️",
      "Data Analyst 📊",
      "Game Developer 🎮",
      "Social Media Manager 📱",
      "Customer Support 📞",
      "Video Editor ✂️",
      "Music Producer 🎵",
      "Community Manager 👥",
      "Voice Actor 🎙️",
      "Translator 🌍",
      "Technical Writer 📝",
    ];

    const job = jobs[Math.floor(Math.random() * jobs.length)];

    // Update user data
    userData.Coins += amount;
    userData.TotalEarned += amount;
    userData.LastWork = new Date();
    await userData.save();

    // Send success message
    const embed = new Discord.EmbedBuilder()
      .setColor(client.config.colors.success || "#00FF00")
      .setTitle("💼 Work Complete!")
      .setDescription(`You worked as a **${job}** and earned coins!`)
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
      .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL() })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  } catch (err) {
    console.error("Error in PVC work command:", err);
    message
      .reply("❌ An error occurred while processing your work command.")
      .catch(() => {});
  }
};
