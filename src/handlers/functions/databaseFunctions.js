const Discord = require("discord.js")

module.exports = (client) => {
  // Get logs channel function
  client.getLogs = async (guildId) => {
    try {
      const LogChannels = require("../../database/models/logChannels")
      const data = await LogChannels.findOne({ Guild: guildId })
      return data ? data.Channel : null
    } catch (error) {
      console.error("Error getting logs channel:", error)
      return null
    }
  }

  // Embed function
  client.embed = async (options, interaction) => {
    try {
      const embed = new Discord.EmbedBuilder().setColor(options.color || "#0099FF").setTimestamp()

      if (options.title) embed.setTitle(options.title)
      if (options.desc || options.description) embed.setDescription(options.desc || options.description)
      if (options.fields) embed.addFields(options.fields)
      if (options.footer) embed.setFooter(options.footer)
      if (options.thumbnail) embed.setThumbnail(options.thumbnail)
      if (options.image) embed.setImage(options.image)

      const messageOptions = { embeds: [embed] }
      if (options.components) messageOptions.components = options.components

      switch (options.type) {
        case "reply":
          if (!interaction.replied && !interaction.deferred) {
            return await interaction.reply(messageOptions)
          } else if (interaction.deferred) {
            return await interaction.editReply(messageOptions)
          } else {
            return await interaction.followUp(messageOptions)
          }
        case "editreply":
          return await interaction.editReply(messageOptions)
        case "followup":
          return await interaction.followUp(messageOptions)
        default:
          if (!interaction.replied && !interaction.deferred) {
            return await interaction.reply(messageOptions)
          } else {
            return await interaction.editReply(messageOptions)
          }
      }
    } catch (error) {
      console.error("Embed function error:", error)
      throw error
    }
  }

  // Error functions
  client.errNormal = async (options, interaction) => {
    try {
      const embed = new Discord.EmbedBuilder()
        .setTitle("❌ Error")
        .setDescription(options.error || "An error occurred")
        .setColor("#FF0000")
        .setTimestamp()

      const messageOptions = {
        embeds: [embed],
        ephemeral: options.type === "ephemeral",
      }

      if (!interaction.replied && !interaction.deferred) {
        return await interaction.reply(messageOptions)
      } else if (interaction.deferred) {
        return await interaction.editReply(messageOptions)
      } else {
        return await interaction.followUp(messageOptions)
      }
    } catch (error) {
      console.error("Error sending error message:", error)
    }
  }

  client.succNormal = async (options, user) => {
    try {
      const embed = new Discord.EmbedBuilder()
        .setTitle("✅ Success")
        .setDescription(options.text || "Success!")
        .setColor("#00FF00")
        .setTimestamp()

      return await user.send({ embeds: [embed] })
    } catch (error) {
      console.error("Success message error:", error)
      throw error
    }
  }

  client.simpleEmbed = async (options, interaction) => {
    try {
      const embed = new Discord.EmbedBuilder()
        .setDescription(options.desc || options.description || "No description")
        .setColor(options.color || "#0099FF")
        .setTimestamp()

      const messageOptions = { embeds: [embed] }

      switch (options.type) {
        case "reply":
          if (!interaction.replied && !interaction.deferred) {
            return await interaction.reply(messageOptions)
          } else {
            return await interaction.editReply(messageOptions)
          }
        default:
          if (!interaction.replied && !interaction.deferred) {
            return await interaction.reply(messageOptions)
          } else {
            return await interaction.editReply(messageOptions)
          }
      }
    } catch (error) {
      console.error("Simple embed error:", error)
      throw error
    }
  }

  // Channel setup function
  client.createChannelSetup = async (model, channel, interaction) => {
    try {
      await model.findOneAndUpdate(
        { Guild: interaction.guild.id },
        {
          Guild: interaction.guild.id,
          Channel: channel.id,
        },
        { upsert: true, new: true },
      )

      const embed = new Discord.EmbedBuilder()
        .setTitle("✅ Setup Complete")
        .setDescription(`Channel has been set to ${channel}`)
        .setColor("#00FF00")
        .setTimestamp()

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ embeds: [embed] })
      } else if (interaction.deferred) {
        await interaction.editReply({ embeds: [embed] })
      } else {
        await interaction.followUp({ embeds: [embed] })
      }
    } catch (error) {
      console.error("Channel setup error:", error)
      throw error
    }
  }
}
