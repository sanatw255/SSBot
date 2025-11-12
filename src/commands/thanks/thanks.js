const Discord = require("discord.js");

const thanksSchema = require("../../database/models/thanks");
const thanksAuthor = require("../../database/models/thanksAuthor");

module.exports = async (client, interaction, args) => {
  const target = interaction.options.getUser("user");
  if (!target)
    return client.errUsage(
      { usage: "thanks [mention user]", type: "editreply" },
      interaction
    );

  if (target.id === interaction.user.id)
    return client.errNormal(
      { error: `You cannot thank yourself!`, type: "editreply" },
      interaction
    );

  try {
    const authorData = await thanksAuthor.findOne({
      User: target.id,
      Author: interaction.user.id,
    });

    if (authorData) {
      client.errNormal(
        { error: `You already thanked this user!`, type: "editreply" },
        interaction
      );
    } else {
      const data = await thanksSchema.findOne({ User: target.id });

      if (data) {
        data.Received += 1;
        await data.save();
        client.succNormal(
          {
            text: `You have thanked <@${target.id}>! They now have \`${data.Received}\` thanks`,
            type: "editreply",
          },
          interaction
        );
      } else {
        await new thanksSchema({
          User: target.id,
          UserTag: target.tag,
          Received: 1,
        }).save();
        client.succNormal(
          {
            text: `You have thanked <@${target.id}>! They now have \`1\` thanks`,
            type: "editreply",
          },
          interaction
        );
      }

      await new thanksAuthor({
        User: target.id,
        Author: interaction.user.id,
      }).save();
    }
  } catch (err) {
    console.error("Error in thanks command:", err);
    client.errNormal(
      {
        error: "An error occurred while processing the thank.",
        type: "editreply",
      },
      interaction
    );
  }
};
