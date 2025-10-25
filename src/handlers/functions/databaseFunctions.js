const Discord = require("discord.js");
const LogChannels = require("../../database/models/logChannels");

module.exports = (client) => {
  client.createChannelSetup = async (Schema, channel, interaction) => {
    await Schema.findOneAndUpdate(
      { Guild: interaction.guild.id },
      { Guild: interaction.guild.id, Channel: channel.id },
      { upsert: true, new: true }
    );

    const embed = new Discord.EmbedBuilder()
      .setTitle("✅ Setup Complete")
      .setDescription(`Channel has been set to ${channel}`)
      .setColor("#00FF00")
      .setTimestamp();

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ embeds: [embed] });
    } else if (interaction.deferred) {
      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.followUp({ embeds: [embed] });
    }
  };

  client.createRoleSetup = async (Schema, role, interaction) => {
    await Schema.findOneAndUpdate(
      { Guild: interaction.guild.id },
      { Guild: interaction.guild.id, Role: role.id },
      { upsert: true, new: true }
    );

    const embed = new Discord.EmbedBuilder()
      .setTitle("✅ Setup Complete")
      .setDescription(`Role has been set to ${role}`)
      .setColor("#00FF00")
      .setTimestamp();

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ embeds: [embed] });
    } else if (interaction.deferred) {
      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.followUp({ embeds: [embed] });
    }
  };

  client.getLogs = async (guildId) => {
    try {
      const data = await LogChannels.findOne({ Guild: guildId });
      return data?.Channel ?? null;
    } catch (e) {
      console.error("Error getting logs channel:", e);
      return null;
    }
  };

  client.errNormal = async (options, interaction) => {
    const embed = new Discord.EmbedBuilder()
      .setTitle("❌ Error")
      .setDescription(options.error || "An error occurred")
      .setColor("#FF0000")
      .setTimestamp();

    const messageOptions = {
      embeds: [embed],
      ephemeral: options.type === "ephemeral",
    };

    try {
      if (!interaction.replied && !interaction.deferred) {
        return await interaction.reply(messageOptions);
      } else if (interaction.deferred) {
        return await interaction.editReply(messageOptions);
      } else {
        return await interaction.followUp(messageOptions);
      }
    } catch (err) {
      console.error("[errNormal]", err);
    }
  };

  client.succNormal = async (options, interaction) => {
    const embed = new Discord.EmbedBuilder()
      .setTitle("✅ Success")
      .setDescription(options.text || "Success!")
      .setColor("#00FF00")
      .setTimestamp();

    if (options.fields) {
      embed.addFields(options.fields);
    }

    try {
      if (options.type === "editreply") {
        return await interaction.editReply({ embeds: [embed] });
      } else if (options.type === "reply") {
        return await interaction.reply({ embeds: [embed] });
      } else if (interaction.deferred || interaction.replied) {
        return await interaction.editReply({ embeds: [embed] });
      } else {
        return await interaction.reply({ embeds: [embed] });
      }
    } catch (err) {
      console.error("[succNormal]", err);
    }
  };

  client.simpleEmbed = async (options, interaction) => {
    const embed = new Discord.EmbedBuilder()
      .setDescription(options.desc || options.description || "No description")
      .setColor(options.color || "#0099FF")
      .setTimestamp();

    try {
      if (interaction.deferred || interaction.replied) {
        return await interaction.editReply({ embeds: [embed] });
      } else {
        return await interaction.reply({ embeds: [embed] });
      }
    } catch (err) {
      console.error("[simpleEmbed]", err);
    }
  };
};
