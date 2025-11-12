const Discord = require("discord.js");

const Schema = require("../../database/models/channelList");

module.exports = async (client, interaction, args) => {
  const type = interaction.options.getString("type");
  const channel = interaction.options.getChannel("channel");

  if (type == "add") {
    try {
      const data = await Schema.findOne({ Guild: interaction.guild.id });

      if (data) {
        if (data.Channels.includes(channel.id)) {
          return client.errNormal(
            {
              error: `The channel ${channel} is already in the database!`,
              type: "editreply",
            },
            interaction
          );
        }

        data.Channels.push(channel.id);
        await data.save();
      } else {
        await new Schema({
          Guild: interaction.guild.id,
          Channels: channel.id,
        }).save();
      }

      client.succNormal(
        {
          text: `Channel has been added to the whitelist!`,
          fields: [
            {
              name: `📘┆Channel`,
              value: `${channel} (${channel.name})`,
            },
          ],
          type: "editreply",
        },
        interaction
      );
    } catch (err) {
      console.error("Error in linkschannel add command:", err);
      client.errNormal(
        {
          error: "An error occurred while adding the channel.",
          type: "editreply",
        },
        interaction
      );
    }
  } else if (type == "remove") {
    try {
      const data = await Schema.findOne({ Guild: interaction.guild.id });

      if (data) {
        if (!data.Channels.includes(channel.id)) {
          return client.errNormal(
            {
              error: `The channel ${channel} doesn't exist in the database!`,
              type: "editreply",
            },
            interaction
          );
        }

        const filtered = data.Channels.filter(
          (target) => target !== channel.id
        );

        await Schema.findOneAndUpdate(
          { Guild: interaction.guild.id },
          {
            Guild: interaction.guild.id,
            Channels: filtered,
          }
        );

        client.succNormal(
          {
            text: `Channel has been removed from the whitelist!`,
            fields: [
              {
                name: `📘┆Channel`,
                value: `${channel} (${channel.name})`,
              },
            ],
            type: "editreply",
          },
          interaction
        );
      } else {
        return client.errNormal(
          {
            error: `This guild has not data!`,
            type: "editreply",
          },
          interaction
        );
      }
    } catch (err) {
      console.error("Error in linkschannel remove command:", err);
      client.errNormal(
        {
          error: "An error occurred while removing the channel.",
          type: "editreply",
        },
        interaction
      );
    }
  }
};
