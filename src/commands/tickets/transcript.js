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
      const data = await ticketSchema.findOne({ Guild: interaction.guild.id });

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
          await client.simpleEmbed(
            {
              desc: `${client.emotes.animated.loading}・Transcript saving...`,
              type: type,
            },
            interaction
          );

          await client.transcript(interaction, interaction.channel);

          return client.simpleEmbed(
            {
              desc: `Transcript saved`,
              type: "editreply",
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
    }
  } catch (err) {
    console.error("Error in transcript ticket command:", err);
    client.errNormal(
      { error: "An error occurred while saving the transcript.", type: type },
      interaction
    );
  }
};
