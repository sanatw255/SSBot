const Discord = require("discord.js");
const Schema = require("../../database/models/reminder");
const ms = require("ms");

module.exports = async (client, interaction, args) => {
  const time = interaction.options.getString("time");
  const text = interaction.options.getString("message");

  const endtime = new Date().getTime() + ms(time);

  try {
    const data = await Schema.findOne({
      Text: text,
      User: interaction.user.id,
      endTime: endtime,
    });

    if (data) {
      return client.errNormal(
        { error: `You already made this reminder!`, type: "editreply" },
        interaction
      );
    } else {
      await new Schema({
        Text: text,
        User: interaction.user.id,
        endTime: endtime,
      }).save();

      client.succNormal(
        {
          text: `Your reminder is set!`,
          fields: [
            {
              name: `${client.emotes.normal.clock}┇End Time`,
              value: `${new Date(endtime).toLocaleTimeString()}`,
              inline: true,
            },
            {
              name: `💭┇Reminder`,
              value: `${text}`,
              inline: true,
            },
          ],
          type: "editreply",
        },
        interaction
      );

      setTimeout(async () => {
        client.embed(
          {
            title: `🔔・Reminder`,
            desc: `Your reminder just ended!`,
            fields: [
              {
                name: `💭┇Reminder`,
                value: `${text}`,
                inline: true,
              },
            ],
          },
          interaction.user
        );

        await Schema.findOneAndDelete({
          Text: text,
          User: interaction.user.id,
          endTime: endtime,
        });
      }, endtime - new Date().getTime());
    }
  } catch (err) {
    console.error("Error in remind command:", err);
    client.errNormal(
      {
        error: "An error occurred while setting the reminder.",
        type: "editreply",
      },
      interaction
    );
  }
};
