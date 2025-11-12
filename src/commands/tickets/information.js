const Discord = require("discord.js");

const ticketSchema = require("../../database/models/tickets");
const ticketChannels = require("../../database/models/ticketChannels");

module.exports = async (client, interaction, args) => {
  try {
    const ticketData = await ticketChannels.findOne({
      Guild: interaction.guild.id,
      channelID: interaction.channel.id,
    });

    if (ticketData) {
      const data = await ticketSchema.findOne({ Guild: interaction.guild.id });

      if (data) {
        const ticketCategory = interaction.guild.channels.cache.get(
          data.Category
        );

        if (ticketCategory == undefined) {
          return client.errNormal(
            {
              error: "Do the setup!",
              type: "editreply",
            },
            interaction
          );
        }

        if (interaction.channel.parentId == ticketCategory.id) {
          const msg = await client.embed(
            {
              desc: `${client.emotes.animated.loading}・Loading information...`,
              type: "editreply",
            },
            interaction
          );

          await client.transcript(interaction, interaction.channel);

          return client.embed(
            {
              title: `ℹ・Information`,
              fields: [
                {
                  name: "Ticket name",
                  value: `\`${interaction.channel.name}\``,
                  inline: true,
                },
                {
                  name: "Channel id",
                  value: `\`${interaction.channel.id}\``,
                  inline: true,
                },
                {
                  name: "Creator",
                  value: `<@!${ticketData.creator}>`,
                  inline: true,
                },
                {
                  name: "Claimed by",
                  value: `<@!${ticketData.claimed}>`,
                  inline: true,
                },
                {
                  name: "Ticket id",
                  value: `${ticketData.TicketID}`,
                  inline: true,
                },
              ],
              type: "editreply",
            },
            msg
          );
        } else {
          client.errNormal(
            {
              error: "This is not a ticket!",
              type: "editreply",
            },
            interaction
          );
        }
      } else {
        return client.errNormal(
          {
            error: "Do the setup!",
            type: "editreply",
          },
          interaction
        );
      }
    }
  } catch (err) {
    console.error("Error in information ticket command:", err);
    client.errNormal(
      {
        error: "An error occurred while fetching ticket information.",
        type: "editreply",
      },
      interaction
    );
  }
};
