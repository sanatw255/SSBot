const Discord = require("discord.js")
const logs = require("../../database/models/logChannels")
const boostLogs = require("../../database/models/boostChannels")
const levelLogs = require("../../database/models/levelChannels")

module.exports = async (client, interaction, args) => {
  try {
    const choice = interaction.options.getString("setup")

    await interaction.deferReply()

    let channelName, model, description

    switch (choice) {
      case "serverLogs":
        channelName = "server-logs"
        model = logs
        description = "Server events and moderation logs"
        break
      case "levelLogs":
        channelName = "level-logs"
        model = levelLogs
        description = "Level up notifications"
        break
      case "boostLogs":
        channelName = "boost-logs"
        model = boostLogs
        description = "Server boost notifications"
        break
      default:
        return await interaction.editReply({
          content: "❌ Invalid setup choice!",
        })
    }

    // Create the channel
    const channel = await interaction.guild.channels.create({
      name: channelName,
      type: Discord.ChannelType.GuildText,
      topic: `Auto-created ${channelName} channel`,
      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone,
          deny: [Discord.PermissionsBitField.Flags.SendMessages],
          allow: [Discord.PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: interaction.guild.members.me.id,
          allow: [
            Discord.PermissionsBitField.Flags.SendMessages,
            Discord.PermissionsBitField.Flags.EmbedLinks,
            Discord.PermissionsBitField.Flags.ViewChannel,
          ],
        },
      ],
    })

    // Save to database
    await model.findOneAndUpdate(
      { Guild: interaction.guild.id },
      {
        Guild: interaction.guild.id,
        Channel: channel.id,
      },
      { upsert: true, new: true },
    )

    const embed = new Discord.EmbedBuilder()
      .setTitle("✅ Auto-Setup Complete")
      .setDescription(`${choice} has been automatically set up!`)
      .addFields([
        {
          name: "📋 Channel",
          value: `${channel}`,
          inline: true,
        },
        {
          name: "📝 Purpose",
          value: description,
          inline: true,
        },
      ])
      .setColor("#00FF00")
      .setTimestamp()

    await interaction.editReply({ embeds: [embed] })

    // Send welcome message to the new channel
    const welcomeEmbed = new Discord.EmbedBuilder()
      .setTitle(`🔧 ${choice} Setup Complete`)
      .setDescription(`This channel has been automatically configured for ${description.toLowerCase()}`)
      .setColor("#0099FF")
      .setTimestamp()

    await channel.send({ embeds: [welcomeEmbed] })
  } catch (error) {
    console.error("Auto-setup logs error:", error)

    if (interaction.deferred) {
      await interaction.editReply({
        content: "❌ An error occurred during auto-setup. Please try again.",
      })
    } else if (!interaction.replied) {
      await interaction.reply({
        content: "❌ An error occurred during auto-setup. Please try again.",
        ephemeral: true,
      })
    }
  }
}
