const Discord = require("discord.js");
const voiceChannels = require("../../database/models/voiceChannels");
const pvcConfig = require("../../database/models/pvcConfig");

module.exports = async (client, message, args) => {
  if (message.author.bot) return;

  try {
    const config = await pvcConfig.findOne({ Guild: message.guild.id });
    if (!config) return;

    // Check if in commands channel
    if (
      config.CommandsChannel &&
      message.channel.id !== config.CommandsChannel
    ) {
      return; // Silently ignore if wrong channel
    }

    const vcData = await voiceChannels.findOne({
      Guild: message.guild.id,
      Owner: message.author.id,
    });

    if (!vcData) {
      if (message.channel.id === config.CommandsChannel) {
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

    const voiceChannel = message.guild.channels.cache.get(vcData.Channel);
    if (!voiceChannel) {
      return message.reply("❌ Your VC no longer exists!").catch(() => {});
    }

    const newLockState = !vcData.IsLocked;

    try {
      // Update permissions
      if (newLockState) {
        // Lock: Remove CONNECT permission from @everyone
        await voiceChannel.permissionOverwrites.edit(message.guild.id, {
          Connect: false,
        });
      } else {
        // Unlock: Allow CONNECT for @everyone
        await voiceChannel.permissionOverwrites.edit(message.guild.id, {
          Connect: null,
        });
      }

      // Update database
      vcData.IsLocked = newLockState;
      await vcData.save();

      const embed = new Discord.EmbedBuilder()
        .setColor("#00FF00")
        .setTitle(
          `${newLockState ? "🔒" : "🔓"} VC ${
            newLockState ? "Locked" : "Unlocked"
          }!`
        )
        .setDescription(
          `Your voice channel **${voiceChannel.name}** has been ${
            newLockState ? "locked" : "unlocked"
          }.\n\n` +
            `${
              newLockState
                ? "Only invited users can join."
                : "Anyone can join now."
            }`
        )
        .setFooter({
          text: message.guild.name,
          iconURL: message.guild.iconURL(),
        })
        .setTimestamp();

      message.reply({ embeds: [embed] });
    } catch (err) {
      console.error("Error locking/unlocking VC:", err);
      return message.reply("❌ Failed to update lock status!").catch(() => {});
    }
  } catch (err) {
    console.error("Error in PVC lock command:", err);
    message.reply("❌ Error toggling lock.").catch(() => {});
  }
};
