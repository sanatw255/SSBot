const Schema = require("../../database/models/logChannels");
const Discord = require("discord.js");
const ticketChannels = require("../../database/models/ticketChannels");

module.exports = async (client, interaction, args) => {
  // Skip if called during bot initialization (interaction is undefined)
  if (!interaction) return;

  // Handle modal submissions
  if (interaction.isModalSubmit()) {
    if (interaction.customId === "ticketReasonModal") {
      const reason = interaction.fields.getTextInputValue("ticketReason");

      // Create ticket with the provided reason
      const ticketCreateModule = require("../../commands/tickets/create");

      // Set the reason in interaction options for the create module
      interaction.options = {
        getString: (key) => {
          if (key === "reason") return reason;
          return null;
        },
      };

      // Call the ticket creation function
      await ticketCreateModule(client, interaction, []);
      return;
    }
  }

  // Handle button interactions
  if (interaction.isButton()) {
    const customId = interaction.customId;

    // TICKET TRANSCRIPT BUTTON
    if (customId === "Bot_transcriptTicket") {
      await interaction.deferReply({ ephemeral: true });
      try {
        await client.transcript(interaction, interaction.user);
        return interaction.editReply({
          content: "📝 Transcript saved and sent to your DMs!",
        });
      } catch (error) {
        console.error("[TRANSCRIPT]:", error);
        return interaction.editReply({
          content: "❌ Error saving transcript",
        });
      }
    }

    // TICKET REOPEN BUTTON
    if (customId === "Bot_openTicket") {
      await interaction.deferReply({ ephemeral: true });
      try {
        const ticketData = await ticketChannels.findOne({
          Guild: interaction.guild.id,
          channelID: interaction.channel.id,
        });

        if (!ticketData) {
          return interaction.editReply({
            content: "❌ Ticket data not found",
          });
        }

        if (ticketData.resolved === false) {
          return interaction.editReply({
            content: "⚠️ This ticket is already open",
          });
        }

        // Reopen ticket
        ticketData.resolved = false;
        await ticketData.save();

        // Change channel name back
        await interaction.channel.edit({
          name: `ticket-${ticketData.TicketID}`,
        });

        // Give user access back
        const user = await client.users.fetch(ticketData.creator);
        await interaction.channel.permissionOverwrites.edit(user, {
          ViewChannel: true,
          SendMessages: true,
          AttachFiles: true,
          ReadMessageHistory: true,
          AddReactions: true,
        });

        interaction.editReply({
          content: "🔓 Ticket has been reopened!",
        });

        // Send reopen message in channel
        await interaction.channel.send({
          embeds: [
            new Discord.EmbedBuilder()
              .setTitle("🔓 Ticket Reopened")
              .setDescription(`This ticket was reopened by ${interaction.user}`)
              .setColor("#00ff00"),
          ],
        });
      } catch (error) {
        console.error("[REOPEN-TICKET]:", error);
        return interaction.editReply({
          content: "❌ Error reopening ticket",
        });
      }
    }

    // TICKET DELETE BUTTON
    if (customId === "Bot_deleteTicket") {
      await interaction.deferReply({ ephemeral: true });
      try {
        const ticketData = await ticketChannels.findOne({
          Guild: interaction.guild.id,
          channelID: interaction.channel.id,
        });

        if (!ticketData) {
          return interaction.editReply({
            content: "❌ Ticket data not found",
          });
        }

        // Delete from database
        await ticketChannels.deleteOne({
          Guild: interaction.guild.id,
          channelID: interaction.channel.id,
        });

        // Delete the channel
        await interaction.channel.delete();
      } catch (error) {
        console.error("[DELETE-TICKET]:", error);
        return interaction.editReply({
          content: "❌ Error deleting ticket",
        });
      }
    }

    // Add additional button handling logic here
    console.log(`Button interaction: ${customId}`);
  }

  // Handle select menus
  if (interaction.isStringSelectMenu()) {
    const customId = interaction.customId;
    console.log(`Select menu interaction: ${customId}`);
  }

  client.getLogs = async (guildId) => {
    const data = await Schema.findOne({ Guild: guildId });
    if (data && data.Channel) {
      const channel = client.channels.cache.get(data.Channel);
      return channel;
    } else {
      return false;
    }
  };

  client.on(Discord.Events.GuildMemberUpdate, (oldMember, newMember) => {
    if (!oldMember.premiumSince && newMember.premiumSince) {
      client.emit("guildMemberBoost", newMember);
    }

    if (oldMember.premiumSince && !newMember.premiumSince) {
      client.emit("guildMemberUnboost", newMember);
    }
  });

  client.on(Discord.Events.GuildUpdate, (oldGuild, newGuild) => {
    if (oldGuild.premiumTier < newGuild.premiumTier) {
      client.emit(
        "guildBoostLevelUp",
        newGuild,
        oldGuild.premiumTier,
        newGuild.premiumTier
      );
    }

    if (oldGuild.premiumTier > newGuild.premiumTier) {
      client.emit(
        "guildBoostLevelDown",
        newGuild,
        oldGuild.premiumTier,
        newGuild.premiumTier
      );
    }

    if (!oldGuild.banner && newGuild.banner) {
      client.emit(
        "guildBannerAdd",
        newGuild,
        newGuild.bannerURL({ size: 1024 })
      );
    }

    if (!oldGuild.afkChannel && newGuild.afkChannel) {
      client.emit("guildAfkChannelAdd", newGuild, newGuild.afkChannel);
    }

    if (!oldGuild.vanityURLCode && newGuild.vanityURLCode) {
      client.emit("guildVanityURLAdd", newGuild, newGuild.vanityURLCode);
    }

    if (oldGuild.vanityURLCode && !newGuild.vanityURLCode) {
      client.emit("guildVanityURLRemove", newGuild, oldGuild.vanityURLCode);
    }

    if (oldGuild.vanityURLCode !== newGuild.vanityURLCode) {
      client.emit(
        "guildVanityURLUpdate",
        newGuild,
        oldGuild.vanityURLCode,
        newGuild.vanityURLCode
      );
    }
  });

  client.on(Discord.Events.GuildRoleUpdate, (oldRole, newRole) => {
    if (oldRole.rawPosition !== newRole.rawPosition) {
      client.emit(
        "rolePositionUpdate",
        newRole,
        oldRole.rawPosition,
        newRole.rawPosition
      );
    }

    if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
      client.emit(
        "rolePermissionsUpdate",
        newRole,
        oldRole.permissions.bitfield,
        newRole.permissions.bitfield
      );
    }

    if (oldRole.color !== newRole.color) {
      client.emit("roleColorUpdate", newRole, oldRole.color, newRole.color);
    }

    if (oldRole.name !== newRole.name) {
      client.emit("roleNameUpdate", newRole, oldRole.name, newRole.name);
    }
  });

  client.on(Discord.Events.ChannelUpdate, (oldChannel, newChannel) => {
    if (
      oldChannel.type === Discord.ChannelType.GuildText &&
      oldChannel.topic !== newChannel.topic
    ) {
      client.emit(
        "channelTopicUpdate",
        newChannel,
        oldChannel.topic,
        newChannel.topic
      );
    }

    if (oldChannel.name !== newChannel.name) {
      client.emit(
        "channelNameUpdate",
        newChannel,
        oldChannel.name,
        newChannel.name
      );
    }
  });
};
