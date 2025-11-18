const Discord = require("discord.js");
const voiceChannels = require("../../database/models/voiceChannels");
const pvcConfig = require("../../database/models/pvcConfig");

module.exports = async (client, message, args) => {
  if (message.author.bot) return;

  try {
    const config = await pvcConfig.findOne({ Guild: message.guild.id });
    if (!config) return;

    const vcData = await voiceChannels.findOne({
      Guild: message.guild.id,
      Owner: message.author.id,
    });

    if (!vcData) {
      if (message.channel.id === config.EconomyChannel) {
        const embed = new Discord.EmbedBuilder()
          .setColor("#FF0000")
          .setTitle("❌ No Active VC")
          .setDescription(
            "You don't have an active VC!\n\nUse `!create <duration>` first."
          )
          .setFooter({
            text: message.guild.name,
            iconURL: message.guild.iconURL(),
          });

        return message.reply({ embeds: [embed] }).then((msg) => {
          setTimeout(() => msg.delete().catch(() => {}), 5000);
        });
      }
      return;
    }

    if (!args[1]) {
      const embed = new Discord.EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("❌ Invalid Usage")
        .setDescription(
          "**Usage**: `!rename <new name>`\n\n**Example**: `!rename Gaming Zone`"
        )
        .setFooter({
          text: message.guild.name,
          iconURL: message.guild.iconURL(),
        });

      return message.reply({ embeds: [embed] }).then((msg) => {
        setTimeout(() => msg.delete().catch(() => {}), 5000);
      });
    }

    const voiceChannel = message.guild.channels.cache.get(vcData.Channel);
    if (!voiceChannel) {
      return message.reply("❌ Your VC no longer exists!").catch(() => {});
    }

    // Get new name (join all args after command)
    const newName = args.slice(1).join(" ");

    if (newName.length > 100) {
      const embed = new Discord.EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("❌ Name Too Long")
        .setDescription("Channel name must be 100 characters or less!")
        .setFooter({
          text: message.guild.name,
          iconURL: message.guild.iconURL(),
        });

      return message.reply({ embeds: [embed] }).then((msg) => {
        setTimeout(() => msg.delete().catch(() => {}), 5000);
      });
    }

    const oldName = voiceChannel.name;

    // Rename the channel
    await voiceChannel.setName(newName);

    const embed = new Discord.EmbedBuilder()
      .setColor("#00FF00")
      .setTitle("✅ VC Renamed!")
      .setDescription(`Your voice channel has been renamed!`)
      .addFields(
        { name: "📛 Old Name", value: oldName, inline: true },
        { name: "📝 New Name", value: newName, inline: true }
      )
      .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL() })
      .setTimestamp();

    message.reply({ embeds: [embed] });
  } catch (err) {
    console.error("Error in PVC rename command:", err);
    message.reply("❌ Error renaming VC.").catch(() => {});
  }
};
