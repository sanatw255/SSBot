const Discord = require("discord.js");

const ticketSchema = require("../../database/models/tickets");
const ticketChannels = require("../../database/models/ticketChannels");
const ticketMessageConfig = require("../../database/models/ticketMessage");

module.exports = async (client, interaction, args) => {
  try {
    let reason = "Not given";
    if (interaction.options) {
      reason = interaction.options.getString("reason") || "Not given";
    }

    let type = "reply";
    if (interaction.isCommand()) {
      type = "editreply";
    }

    // Check if user already has an open ticket
    const existingTicket = await ticketChannels.findOne({
      Guild: interaction.guild.id,
      creator: interaction.user.id,
      resolved: false,
    });

    if (existingTicket) {
      const errorMessage = "Ticket limit reached. 1/1";
      if (interaction.isCommand()) {
        return client.errNormal(
          {
            error: errorMessage,
            type: "ephemeraledit",
          },
          interaction
        );
      } else {
        return client.errNormal(
          {
            error: errorMessage,
            type: "ephemeral",
          },
          interaction
        );
      }
    }

    // Get ticket configuration
    const ticketData = await ticketSchema.findOne({
      Guild: interaction.guild.id,
    });

    if (!ticketData) {
      return client.errNormal(
        {
          error:
            "Ticket system not configured! Please run /setup tickets first.",
          type: type,
        },
        interaction
      );
    }

    const logsChannel = interaction.guild.channels.cache.get(ticketData.Logs);
    const ticketCategory = interaction.guild.channels.cache.get(
      ticketData.Category
    );
    const ticketRole = interaction.guild.roles.cache.get(ticketData.Role);

    if (!ticketCategory) {
      return client.errNormal(
        {
          error:
            "Ticket category not found! Please reconfigure with /setup tickets.",
          type: type,
        },
        interaction
      );
    }

    // Find roles to ping
    const rolesToPing = [];

    // Add main ticket role
    if (ticketRole) rolesToPing.push(ticketRole);

    // Find admin roles
    const adminRole = interaction.guild.roles.cache.find(
      (r) =>
        r.name.toLowerCase().includes("admin") ||
        r.name.toLowerCase().includes("administrator")
    );
    if (adminRole && adminRole.id !== ticketRole?.id) {
      rolesToPing.push(adminRole);
    }

    // Find moderator roles
    const modRole = interaction.guild.roles.cache.find(
      (r) =>
        r.name.toLowerCase().includes("mod") ||
        r.name.toLowerCase().includes("moderator")
    );
    if (
      modRole &&
      modRole.id !== ticketRole?.id &&
      modRole.id !== adminRole?.id
    ) {
      rolesToPing.push(modRole);
    }

    // Find staff roles
    const staffRole = interaction.guild.roles.cache.find(
      (r) =>
        r.name.toLowerCase().includes("staff") ||
        r.name.toLowerCase().includes("support")
    );
    if (staffRole && !rolesToPing.find((role) => role.id === staffRole.id)) {
      rolesToPing.push(staffRole);
    }

    // Get custom ticket message
    let openTicket =
      "Thanks for creating a ticket! \nSupport will be with you shortly \n\n🔒 - Close ticket \n✋ - Claim ticket \n📝 - Save transcript \n🔔 - Send a notification";

    const ticketMessageData = await ticketMessageConfig.findOne({
      Guild: interaction.guild.id,
    });
    if (ticketMessageData) {
      openTicket = ticketMessageData.openTicket;
    }

    // Create action row with buttons
    const row = new Discord.ActionRowBuilder().addComponents(
      new Discord.ButtonBuilder()
        .setCustomId("Bot_closeticket")
        .setEmoji("🔒")
        .setStyle(Discord.ButtonStyle.Primary),
      new Discord.ButtonBuilder()
        .setCustomId("Bot_claimTicket")
        .setEmoji("✋")
        .setStyle(Discord.ButtonStyle.Primary),
      new Discord.ButtonBuilder()
        .setCustomId("Bot_transcriptTicket")
        .setEmoji("📝")
        .setStyle(Discord.ButtonStyle.Primary),
      new Discord.ButtonBuilder()
        .setCustomId("Bot_noticeTicket")
        .setEmoji("🔔")
        .setStyle(Discord.ButtonStyle.Primary)
    );

    // Show progress message
    await client.embed(
      {
        title: `${client.emotes.animated.loading}・Progress`,
        desc: `Your ticket is being created...`,
        type: "ephemeral",
      },
      interaction
    );

    // Update ticket count
    if (ticketData.TicketCount) {
      ticketData.TicketCount += 1;
    } else {
      ticketData.TicketCount = 1;
    }
    await ticketData.save();

    const ticketid = String(ticketData.TicketCount).padStart(4, "0");

    // Set up permissions
    const permsToHave = [
      Discord.PermissionsBitField.Flags.AddReactions,
      Discord.PermissionsBitField.Flags.SendMessages,
      Discord.PermissionsBitField.Flags.ViewChannel,
      Discord.PermissionsBitField.Flags.AttachFiles,
      Discord.PermissionsBitField.Flags.ReadMessageHistory,
    ];

    const permissionOverwrites = [
      {
        deny: [Discord.PermissionsBitField.Flags.ViewChannel],
        id: interaction.guild.id,
      },
      {
        allow: permsToHave,
        id: interaction.user.id,
      },
    ];

    // Add permissions for all roles to ping
    rolesToPing.forEach((roleToAdd) => {
      if (roleToAdd) {
        permissionOverwrites.push({
          allow: permsToHave,
          id: roleToAdd.id,
        });
      }
    });

    // Create ticket channel
    const channel = await interaction.guild.channels.create({
      name: `ticket-${ticketid}`,
      permissionOverwrites: permissionOverwrites,
      parent: ticketCategory.id,
    });

    // Save ticket to database
    const newTicket = new ticketChannels({
      Guild: interaction.guild.id,
      TicketID: ticketid,
      channelID: channel.id,
      creator: interaction.user.id,
      claimed: "None",
    });
    await newTicket.save();

    // Send success message
    await client.embed(
      {
        title: `⚙️・System`,
        desc: `Ticket has been created`,
        fields: [
          {
            name: "👤┆Creator",
            value: `${interaction.user}`,
            inline: true,
          },
          {
            name: "📂┆Channel",
            value: `${channel}`,
            inline: true,
          },
          {
            name: "⏰┆Created at",
            value: `<t:${Math.floor(Date.now() / 1000)}:f>`,
            inline: true,
          },
        ],
        type: "editreply",
      },
      interaction
    );

    // Log ticket creation
    if (logsChannel) {
      await client.embed(
        {
          title: `📝・Open ticket`,
          desc: `A new ticket has been created`,
          fields: [
            {
              name: "👤┆Creator",
              value: `${interaction.user.tag} (${interaction.user.id})`,
              inline: false,
            },
            {
              name: "📂┆Channel",
              value: `${channel.name} is found at ${channel}`,
              inline: false,
            },
            {
              name: "⏰┆Created at",
              value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
              inline: false,
            },
          ],
        },
        logsChannel
      );
    }

    // Create content string with all roles to ping
    let contentString = `${interaction.user}`;
    rolesToPing.forEach((roleToAdd) => {
      if (roleToAdd) {
        contentString += ` ${roleToAdd}`;
      }
    });

    // Send ticket message in the new channel
    await client.embed(
      {
        desc: openTicket,
        fields: [
          {
            name: "👤┆Creator",
            value: `${interaction.user}`,
            inline: true,
          },
          {
            name: "📄┆Subject",
            value: `${reason}`,
            inline: true,
          },
          {
            name: "⏰┆Created at",
            value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
            inline: true,
          },
        ],
        components: [row],
        content: contentString,
      },
      channel
    );
  } catch (err) {
    console.error("Ticket creation error:", err);

    const errorMessage =
      "There was an error creating your ticket. Please try again.";

    try {
      if (interaction.replied || interaction.deferred) {
        return client.errNormal(
          {
            error: errorMessage,
            type: "editreply",
          },
          interaction
        );
      } else {
        return client.errNormal(
          {
            error: errorMessage,
            type: "ephemeral",
          },
          interaction
        );
      }
    } catch (replyError) {
      console.error("Error sending error message:", replyError);
    }
  }
};
