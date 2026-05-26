const Discord = require("discord.js")
const logs = require("../../database/models/logChannels")
const boostLogs = require("../../database/models/boostChannels")
const levelLogs = require("../../database/models/levelChannels")

module.exports = async (client, interaction, args) => {
  try {
    const choice = interaction.options.getString("setup")
    const channel = interaction.options.getChannel("channel")

    if (!channel) {
      return await interaction.editReply({
        content: "❌ Please provide a valid channel!",
      })
    }

    if (channel.type !== Discord.ChannelType.GuildText) {
      return await interaction.editReply({
        content: "❌ Please provide a text channel!",
      })
    }

    // Check bot permissions
    const botPermissions = channel.permissionsFor(interaction.guild.members.me)
    if (!botPermissions || !botPermissions.has(["SendMessages", "EmbedLinks"])) {
      return await interaction.reply({
        content: "❌ I need Send Messages and Embed Links permissions in that channel!",
        ephemeral: true,
      })
    }

    const choices = {
      serverLogs: logs,
      levelLogs: levelLogs,
      boostLogs: boostLogs,
    }

    const selectedModel = choices[choice]
      if (!selectedModel) {
        return await interaction.editReply({
          content: "❌ Invalid setup choice!",
        })
      }

    // Save to database
    await selectedModel.findOneAndUpdate(
      { Guild: interaction.guild.id },
      {
        Guild: interaction.guild.id,
        Channel: channel.id,
      },
      { upsert: true, new: true },
    )

    const embed = new Discord.EmbedBuilder()
      .setTitle("✅ Setup Complete")
      .setDescription(`${choice} has been set to ${channel}`)
      .setColor("#00FF00")
      .setTimestamp()

    await interaction.editReply({ embeds: [embed] })

    // Send test message to the channel
    const testEmbed = new Discord.EmbedBuilder()
      .setTitle(`🔧 ${choice} Setup`)
      .setDescription(`This channel has been configured for ${choice}`)
      .setColor("#0099FF")
      .setTimestamp()

    await channel.send({ embeds: [testEmbed] })
  } catch (error) {
    console.error("Setup logs error:", error)
    await interaction.editReply({
      content: "❌ An error occurred while setting up logs.",
    }).catch(() => {})
  }
}
