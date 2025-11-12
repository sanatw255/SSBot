const Discord = require("discord.js");

const ticketSchema = require("../../database/models/tickets");
const ticketChannels = require("../../database/models/ticketChannels");

module.exports = async (client, interaction, args) => {
  const perms = await client.checkUserPerms(
    {
      flags: [Discord.PermissionsBitField.Flags.ManageMessages],
      perms: [Discord.PermissionsBitField.Flags.ManageMessages],
    },
    interaction
  );

  if (perms == false) return;

  let type = "reply";
  if (interaction.isCommand()) type = "editreply";

  try {
    const ticketData = await ticketChannels.findOne({
      Guild: interaction.guild.id,
      channelID: interaction.channel.id,
    });

    if (ticketData) {
      if (interaction.user.id !== ticketData.creator) {
        const data = await ticketSchema.findOne({
          Guild: interaction.guild.id,
        });

        if (data) {
          const ticketCategory = interaction.guild.channels.cache.get(
            data.Category
          );

          if (ticketCategory == undefined) {
            return client.errNormal(
              {
                error: "Do the setup!",
                type: type,
              },
              interaction
            );
          }

          if (interaction.channel.parentId == ticketCategory.id) {
            client.simpleEmbed(
              {
                desc: `Hey <@!${ticketData.creator}>, \n\nCan we still help you? \nIf there is no response within **24 hours**, we will close this ticket \n\n- Team ${interaction.guild.name}`,
                content: `<@!${ticketData.creator}>`,
                type: type,
              },
              interaction
            );
          } else {
            client.errNormal(
              {
                error: "This is not a ticket!",
                type: type,
              },
              interaction
            );
          }
        } else {
          return client.errNormal(
            {
              error: "Do the setup!",
              type: type,
            },
            interaction
          );
        }
      } else {
        return client.errNormal(
          {
            error: "You are not allowed to notice your own ticket!",
            type: "ephemeral",
          },
          interaction
        );
      }
    }
  } catch (err) {
    console.error("Error in notice ticket command:", err);
    client.errNormal(
      { error: "An error occurred while sending the notice.", type: type },
      interaction
    );
  }
};
