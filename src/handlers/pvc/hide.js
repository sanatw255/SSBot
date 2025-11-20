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

    const newHideState = !vcData.IsHidden;

    try {
      // Update permissions
      if (newHideState) {
        // Hide: Remove VIEW_CHANNEL permission from @everyone
        await voiceChannel.permissionOverwrites.edit(message.guild.id, {
          ViewChannel: false,
        });
      } else {
        // Unhide: Allow VIEW_CHANNEL for @everyone
        await voiceChannel.permissionOverwrites.edit(message.guild.id, {
          ViewChannel: null,
        });
      }

      // Update database
      vcData.IsHidden = newHideState;
      await vcData.save();

      const embed = new Discord.EmbedBuilder()
        .setColor("#00FF00")
        .setTitle(
          `${newHideState ? "👁️‍🗨️" : "👁️"} VC ${
            newHideState ? "Hidden" : "Visible"
          }!`
        )
        .setDescription(
          `Your voice channel **${voiceChannel.name}** is now ${
            newHideState ? "hidden" : "visible"
          }.\n\n` +
            `${
              newHideState
                ? "Only you and invited users can see it."
                : "Everyone can see it now."
            }`
        )
        .setFooter({
          text: message.guild.name,
          iconURL: message.guild.iconURL(),
        })
        .setTimestamp();

      message.reply({ embeds: [embed] });
    } catch (err) {
      console.error("Error hiding/unhiding VC:", err);
      return message.reply("❌ Failed to update visibility!").catch(() => {});
    }
  } catch (err) {
    console.error("Error in PVC hide command:", err);
    message.reply("❌ Error toggling visibility.").catch(() => {});
  }
};
