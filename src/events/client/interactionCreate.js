const Discord = require("discord.js");
const Captcha = require("@haileybot/captcha-generator");

const reactionSchema = require("../../database/models/reactionRoles");
const banSchema = require("../../database/models/userBans");
const verify = require("../../database/models/verify");
const Commands = require("../../database/models/customCommand");
const CommandsSchema = require("../../database/models/customCommandAdvanced");
const ticketSchema = require("../../database/models/tickets");
const ticketChannels = require("../../database/models/ticketChannels");
const ticketMessageConfig = require("../../database/models/ticketMessage");

module.exports = async (client, interaction) => {
  // Handle modal submissions FIRST
  if (interaction.isModalSubmit()) {
    if (interaction.customId === "ticketReasonModal") {
      try {
        const reason = interaction.fields.getTextInputValue("ticketReason");

        // Check if user already has an open ticket
        const existingTicket = await ticketChannels.findOne({
          Guild: interaction.guild.id,
          creator: interaction.user.id,
          resolved: false,
        });

        if (existingTicket) {
          return await interaction.reply({
            content: "❌ Ticket limit reached. 1/1",
            ephemeral: true,
          });
        }

        // Get ticket configuration
        const ticketData = await ticketSchema.findOne({
          Guild: interaction.guild.id,
        });

        if (!ticketData) {
          return await interaction.reply({
            content:
              "❌ Ticket system not configured! Please run /setup tickets first.",
            ephemeral: true,
          });
        }

        const logsChannel = interaction.guild.channels.cache.get(
          ticketData.Logs
        );
        const ticketCategory = interaction.guild.channels.cache.get(
          ticketData.Category
        );
        const ticketRole = interaction.guild.roles.cache.get(ticketData.Role);

        if (!ticketCategory) {
          return await interaction.reply({
            content:
              "❌ Ticket category not found! Please reconfigure with /setup tickets.",
            ephemeral: true,
          });
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
        if (
          staffRole &&
          !rolesToPing.find((role) => role.id === staffRole.id)
        ) {
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
        await interaction.reply({
          embeds: [
            new Discord.EmbedBuilder()
              .setTitle("⏳ Progress")
              .setDescription("Your ticket is being created...")
              .setColor("#5865F2"),
          ],
          ephemeral: true,
        });

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
        await interaction.editReply({
          embeds: [
            new Discord.EmbedBuilder()
              .setTitle("⚙️ System")
              .setDescription("Ticket has been created")
              .addFields([
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
              ])
              .setColor("#00FF00"),
          ],
        });

        // Log ticket creation
        if (logsChannel) {
          await logsChannel.send({
            embeds: [
              new Discord.EmbedBuilder()
                .setTitle("📝 Open ticket")
                .setDescription("A new ticket has been created")
                .addFields([
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
                ])
                .setColor("#5865F2"),
            ],
          });
        }

        // Create content string with all roles to ping
        let contentString = `${interaction.user}`;
        rolesToPing.forEach((roleToAdd) => {
          if (roleToAdd) {
            contentString += ` ${roleToAdd}`;
          }
        });

        // Send ticket message in the new channel
        await channel.send({
          content: contentString,
          embeds: [
            new Discord.EmbedBuilder()
              .setDescription(openTicket)
              .addFields([
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
              ])
              .setColor("#5865F2"),
          ],
          components: [row],
        });

        return;
      } catch (error) {
        console.error("Modal submission error:", error);
        try {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
              content:
                "❌ There was an error creating your ticket. Please try again.",
              ephemeral: true,
            });
          } else {
            await interaction.editReply({
              content:
                "❌ There was an error creating your ticket. Please try again.",
            });
          }
        } catch (replyError) {
          console.error("Error sending error message:", replyError);
        }
        return;
      }
    }
  }

  // Commands
  if (interaction.isCommand() || interaction.isUserContextMenuCommand()) {
    try {
      const banData = await banSchema.findOne({ User: interaction.user.id });
      if (banData) {
        return await interaction.reply({
          content: "❌ You have been banned by the developers of this bot",
          ephemeral: true,
        });
      }

      const cmd = client.commands.get(interaction.commandName);
      if (!cmd) {
        const cmdd = await Commands.findOne({
          Guild: interaction.guild.id,
          Name: interaction.commandName,
        });
        if (cmdd) {
          return interaction.channel.send({ content: cmdd.Responce });
        }

        const cmdx = await CommandsSchema.findOne({
          Guild: interaction.guild.id,
          Name: interaction.commandName,
        });
        if (cmdx) {
          if (cmdx.Action == "Normal") {
            return interaction.reply({ content: cmdx.Responce });
          } else if (cmdx.Action == "Embed") {
            return interaction.reply({
              embeds: [
                new Discord.EmbedBuilder()
                  .setDescription(cmdx.Responce)
                  .setColor("#5865F2"),
              ],
            });
          } else if (cmdx.Action == "DM") {
            await interaction.deferReply({ ephemeral: true });
            interaction.editReply({
              content: "I have sent you something in your DMs",
            });
            return interaction.user
              .send({ content: cmdx.Responce })
              .catch((e) => {
                interaction.editReply({
                  content: "❌ I can't DM you, maybe you have DM turned off!",
                });
              });
          }
        }
      }

      if (
        interaction.options?._subcommand !== null &&
        interaction.options?.getSubcommand() == "help"
      ) {
        const commands = interaction.client.commands
          .filter((x) => x.data.name == interaction.commandName)
          .map((x) =>
            x.data.options
              .map((c) => "`" + c.name + "` - " + c.description)
              .join("\n")
          );

        return interaction.reply({
          embeds: [
            new Discord.EmbedBuilder()
              .setTitle("❓ Help panel")
              .setDescription(
                `Get help with the commands in \`${interaction.commandName}\` \n\n${commands}`
              )
              .setColor("#5865F2"),
          ],
        });
      }

      if (cmd) {
        cmd
          .run(client, interaction, interaction.options?._hoistedOptions)
          .catch((err) => {
            client.emit(
              "errorCreate",
              err,
              interaction.commandName,
              interaction
            );
          });
      }
    } catch (error) {
      console.error("Command error:", error);
    }
  }

  // Verify system
  if (interaction.isButton() && interaction.customId == "Bot_verify") {
    const data = await verify.findOne({
      Guild: interaction.guild.id,
      Channel: interaction.channel.id,
    });
    if (data) {
      const captcha = new Captcha();

      try {
        var image = new Discord.AttachmentBuilder(captcha.JPEGStream, {
          name: "captcha.jpeg",
        });

        interaction.reply({ files: [image], withResponse: true }).then((msg) => {
          const filter = (s) => s.author.id == interaction.user.id;

          interaction.channel
            .awaitMessages({ filter, max: 1 })
            .then((response) => {
              if (response.first().content === captcha.value) {
                response.first().delete();
                msg.delete();

                interaction.user
                  .send("✅ You have been successfully verified!")
                  .catch(() => {});

                var verifyUser = interaction.guild.members.cache.get(
                  interaction.user.id
                );
                verifyUser.roles.add(data.Role);
              } else {
                response.first().delete();
                msg.delete();

                interaction
                  .followUp({
                    content: "❌ You have answered the captcha incorrectly!",
                    ephemeral: true,
                  })
                  .then((msgError) => {
                    setTimeout(() => {
                      msgError.delete().catch(() => {});
                    }, 2000);
                  });
              }
            });
        });
      } catch (error) {
        console.log(error);
      }
    } else {
      await interaction.reply({
        content:
          "❌ Verify is disabled in this server! Or you are using the wrong channel!",
        ephemeral: true,
      });
    }
  }

  // Handle ticket creation button - SHOW MODAL
  if (interaction.isButton() && interaction.customId == "Bot_openticket") {
    try {
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
    } catch (error) {
      console.error("Error showing modal:", error);
      await interaction.reply({
        content:
          "❌ There was an error showing the ticket form. Please try again.",
        ephemeral: true,
      });
    }
  }

  // Reaction roles button
  if (interaction.isButton()) {
    var buttonID = interaction.customId.split("-");

    if (buttonID[0] == "reaction_button") {
      try {
        const data = await reactionSchema.findOne({
          Message: interaction.message.id,
        });
        if (!data) return;

        const [roleid] = data.Roles[buttonID[1]];

        if (interaction.member.roles.cache.get(roleid)) {
          interaction.guild.members.cache
            .get(interaction.user.id)
            .roles.remove(roleid)
            .catch((error) => {});

          interaction.reply({
            content: `<@&${roleid}> was removed!`,
            ephemeral: true,
          });
        } else {
          interaction.guild.members.cache
            .get(interaction.user.id)
            .roles.add(roleid)
            .catch((error) => {});

          interaction.reply({
            content: `<@&${roleid}> was added!`,
            ephemeral: true,
          });
        }
      } catch (error) {
        console.error("Reaction role error:", error);
      }
    }
  }

  // Reaction roles select
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId == "reaction_select") {
      try {
        const data = await reactionSchema.findOne({
          Message: interaction.message.id,
        });
        if (!data) return;

        let roles = "";

        for (let i = 0; i < interaction.values.length; i++) {
          const [roleid] = data.Roles[interaction.values[i]];

          roles += `<@&${roleid}> `;

          if (interaction.member.roles.cache.get(roleid)) {
            interaction.guild.members.cache
              .get(interaction.user.id)
              .roles.remove(roleid)
              .catch((error) => {});
          } else {
            interaction.guild.members.cache
              .get(interaction.user.id)
              .roles.add(roleid)
              .catch((error) => {});
          }

          if (i + 1 === interaction.values.length) {
            interaction.reply({
              content: `I have updated the following roles for you: ${roles}`,
              ephemeral: true,
            });
          }
        }
      } catch (error) {
        console.error("Select menu error:", error);
      }
    }
  }

  // Other ticket buttons
  if (interaction.customId == "Bot_closeticket") {
    return require(`${process.cwd()}/src/commands/tickets/close.js`)(
      client,
      interaction
    );
  }

  if (interaction.customId == "Bot_claimTicket") {
    return require(`${process.cwd()}/src/commands/tickets/claim.js`)(
      client,
      interaction
    );
  }

  if (interaction.customId == "Bot_transcriptTicket") {
    return require(`${process.cwd()}/src/commands/tickets/transcript.js`)(
      client,
      interaction
    );
  }

  if (interaction.customId == "Bot_openTicket") {
    return require(`${process.cwd()}/src/commands/tickets/open.js`)(
      client,
      interaction
    );
  }

  if (interaction.customId == "Bot_deleteTicket") {
    return require(`${process.cwd()}/src/commands/tickets/delete.js`)(
      client,
      interaction
    );
  }

  if (interaction.customId == "Bot_noticeTicket") {
    return require(`${process.cwd()}/src/commands/tickets/notice.js`)(
      client,
      interaction
    );
  }
};
