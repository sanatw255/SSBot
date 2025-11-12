const Schema = require("../../database/models/profile");

module.exports = async (client, interaction, args) => {
  const actor = interaction.options.getString("actor");
  const user = { User: interaction.user.id };

  try {
    const data = await Schema.findOne({ User: interaction.user.id });

    if (data) {
      if (data && data.Actors) {
        if (!data.Actors.includes(actor)) {
          return client.errNormal(
            {
              error: `That actor doesn't exist in the database!`,
              type: "editreply",
            },
            interaction
          );
        }

        const filtered = data.Actors.filter((target) => target !== actor);

        await Schema.findOneAndUpdate(user, {
          Actors: filtered,
        });
      }
      client.succNormal(
        {
          text: "Removed your actor",
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
    console.error("Error in delactor profile command:", err);
    client.errNormal(
      {
        error: "An error occurred while removing the actor.",
        type: "editreply",
      },
      interaction
    );
  }
};
