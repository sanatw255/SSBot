const Discord = require("discord.js");

module.exports = async (client, interaction, args) => {
  const customId = interaction.customId;

  if (customId === "Bot_createTicket") {
    // Show modal for ticket reason
    const modal = new Discord.ModalBuilder()
      .setCustomId("ticketReasonModal")
      .setTitle("Create Support Ticket");

    const reasonInput = new Discord.TextInputBuilder()
      .setCustomId("ticketReason")
      .setLabel("What do you need help with?")
      .setStyle(Discord.TextInputStyle.Paragraph)
      .setPlaceholder("Please describe your issue or question...")
      .setRequired(true)
      .setMaxLength(1000);

    const firstActionRow = new Discord.ActionRowBuilder().addComponents(
      reasonInput
    );
    modal.addComponents(firstActionRow);

    await interaction.showModal(modal);
    return;
  }

  // Handle other button interactions
  if (customId === "Bot_closeticket") {
    require("../functions/ticket")(client);
    const isTicket = await client.isTicket(interaction);
    if (!isTicket) {
      return client.errNormal(
        {
          error: "This is not a ticket channel!",
          type: "ephemeral",
        },
        interaction
      );
    }

    const ticketData = await client.getChannelTicket(interaction);
    if (!ticketData) {
      return client.errNormal(
        {
          error: "Ticket data not found!",
          type: "ephemeral",
        },
        interaction
      );
    }

    // Close ticket logic here
    await interaction.deferReply({ ephemeral: true });

    try {
      await interaction.channel.delete();
    } catch (error) {
      console.error("Error deleting ticket channel:", error);
      return client.errNormal(
        {
          error: "Failed to close ticket!",
          type: "editreply",
        },
        interaction
      );
    }
  }

  if (customId === "Bot_claimTicket") {
    require("../functions/ticket")(client);
    const isTicket = await client.isTicket(interaction);
    if (!isTicket) {
      return client.errNormal(
        {
          error: "This is not a ticket channel!",
          type: "ephemeral",
        },
        interaction
      );
    }

    const ticketData = await client.getChannelTicket(interaction);
    if (!ticketData) {
      return client.errNormal(
        {
          error: "Ticket data not found!",
          type: "ephemeral",
        },
        interaction
      );
    }

    if (ticketData.claimed !== "None") {
      return client.errNormal(
        {
          error: "This ticket is already claimed!",
          type: "ephemeral",
        },
        interaction
      );
    }

    // Update ticket as claimed
    ticketData.claimed = interaction.user.id;
    await ticketData.save();

    await client.embed(
      {
        title: "🎫・Ticket Claimed",
        desc: `This ticket has been claimed by ${interaction.user}`,
        type: "reply",
      },
      interaction
    );
  }

  if (customId === "Bot_transcriptTicket") {
    require("../functions/ticket")(client);
    const isTicket = await client.isTicket(interaction);
    if (!isTicket) {
      return client.errNormal(
        {
          error: "This is not a ticket channel!",
          type: "ephemeral",
        },
        interaction
      );
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      await client.transcript(interaction, interaction.channel);
      await client.embed(
        {
          title: "📝・Transcript",
          desc: "Transcript has been generated and sent!",
          type: "editreply",
        },
        interaction
      );
    } catch (error) {
      console.error("Error creating transcript:", error);
      return client.errNormal(
        {
          error: "Failed to create transcript!",
          type: "editreply",
        },
        interaction
      );
    }
  }

  if (customId === "Bot_noticeTicket") {
    require("../functions/ticket")(client);
    const isTicket = await client.isTicket(interaction);
    if (!isTicket) {
      return client.errNormal(
        {
          error: "This is not a ticket channel!",
          type: "ephemeral",
        },
        interaction
      );
    }

    const ticketData = await client.getTicketData(interaction);
    if (!ticketData) {
      return client.errNormal(
        {
          error: "Ticket configuration not found!",
          type: "ephemeral",
        },
        interaction
      );
    }

    const ticketRole = interaction.guild.roles.cache.get(ticketData.Role);
    if (!ticketRole) {
      return client.errNormal(
        {
          error: "Ticket role not found!",
          type: "ephemeral",
        },
        interaction
      );
    }

    await client.embed(
      {
        title: "🔔・Ticket Notice",
        desc: `${ticketRole} - Attention needed in this ticket!`,
        content: `${ticketRole}`,
        type: "reply",
      },
      interaction
    );
  }
};
