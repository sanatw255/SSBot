const Discord = require("discord.js");
const pvcEconomy = require("../../database/models/pvcEconomy");

module.exports = async (client, message, args) => {
  // Ignore bots
  if (message.author.bot) return;

  try {
    // Check if user has Administrator permission
    if (
      !message.member.permissions.has(Discord.PermissionFlagsBits.Administrator)
    ) {
      return; // Silently ignore non-admins
    }

    // Check if user mentioned someone
    const target = message.mentions.users.first();
    if (!target) {
      const embed = new Discord.EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("❌ Invalid Usage")
        .setDescription(
          `Please mention a user!\n\n**Usage**: \`!resetcoins @user\`\n**Example**: \`!resetcoins @John\``
        )
        .setFooter({
          text: message.guild.name,
          iconURL: message.guild.iconURL(),
        });

      return message.reply({ embeds: [embed] }).then((msg) => {
        setTimeout(() => msg.delete().catch(() => {}), 5000);
      });
    }

    // Get user's economy data
    let userData = await pvcEconomy.findOne({
      Guild: message.guild.id,
      User: target.id,
    });

    const oldBalance = userData ? userData.Coins : 0;

    if (!userData) {
      // Create new entry with 0 coins
      userData = await new pvcEconomy({
        Guild: message.guild.id,
        User: target.id,
        Coins: 0,
      }).save();
    } else {
      // Reset to 0
      userData.Coins = 0;
      await userData.save();
    }

    // Success message
    const embed = new Discord.EmbedBuilder()
      .setColor("#00FF00")
      .setTitle("✅ Coins Reset")
      .setDescription(
        `Successfully reset ${target}'s coins!\n\n` +
          `**Previous Balance**: ${oldBalance.toLocaleString()} coins\n` +
          `**New Balance**: 0 coins`
      )
      .setFooter({
        text: `Admin: ${message.author.username}`,
        iconURL: message.author.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp();

    await message.reply({ embeds: [embed] });

    // Log action
    console.log(
      `[PVC Admin] ${message.author.tag} reset ${target.tag}'s coins (was ${oldBalance})`
    );
  } catch (err) {
    console.error("Error in resetcoins command:", err);
    message
      .reply("❌ An error occurred while resetting coins.")
      .catch(() => {});
  }
};
