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
    const data = await ticketSchema.findOne({ Guild: interaction.guild.id });

    if (data) {
      const ticketCategory = interaction.guild.channels.cache.get(
        data.Category
      );

      if (ticketCategory == undefined) {
        return client.errNormal(
          {
            error: "Do the ticket setup!",
            type: type,
          },
          interaction
        );
      }

      if (interaction.channel.parentId == ticketCategory.id) {
        await client.simpleEmbed(
          {
            desc: `Delete this ticket in **5s**`,
            type: type,
          },
          interaction
        );

        setTimeout(async () => {
          try {
            await interaction.channel.delete();
            const ticketData = await ticketChannels.findOne({
              Guild: interaction.guild.id,
              channelID: interaction.channel.id,
            });
            if (ticketData) {
              await ticketChannels.deleteOne({
                Guild: interaction.guild.id,
                channelID: interaction.channel.id,
              });
            }
          } catch (err) {
            console.error("Error deleting ticket channel:", err);
          }
        }, 5000);
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
          error: "Do the ticket setup!",
          type: type,
        },
        interaction
      );
    }
  } catch (err) {
    console.error("Error in delete ticket command:", err);
    client.errNormal(
      { error: "An error occurred while deleting the ticket.", type: type },
      interaction
    );
  }
};
