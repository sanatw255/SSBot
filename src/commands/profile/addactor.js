const Schema = require("../../database/models/profile");

module.exports = async (client, interaction, args) => {
  const actor = interaction.options.getString("actor");

  try {
    const data = await Schema.findOne({ User: interaction.user.id });

    if (data) {
      if (data && data.Actors) {
        if (data.Actors.includes(actor)) {
          return client.errNormal(
            {
              error: `That actor is already exists in your database!`,
              type: "editreply",
            },
            interaction
          );
        }
        data.Actors.push(actor);
        await data.save();
      } else {
        data.Actors = actor;
        await data.save();
      }
      client.succNormal(
        {
          text: "Added your actor",
          fields: [
            {
              name: "👨‍🎤┆Actor",
              value: `\`\`\`${actor}\`\`\``,
              inline: true,
            },
          ],
          type: "editreply",
        },
        interaction
      );
    } else {
      return client.errNormal(
        {
          error: "No profile found! Open a profile with createprofile",
          type: "editreply",
        },
        interaction
      );
    }
  } catch (err) {
    console.error("Error in addactor profile command:", err);
    client.errNormal(
      { error: "An error occurred while adding the actor.", type: "editreply" },
      interaction
    );
  }
};
