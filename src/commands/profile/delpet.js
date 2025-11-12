const Schema = require("../../database/models/profile");

module.exports = async (client, interaction, args) => {
  const pet = interaction.options.getString("pet");
  const user = { User: interaction.user.id };

  try {
    const data = await Schema.findOne({ User: interaction.user.id });

    if (data) {
      if (data && data.Pets) {
        if (!data.Pets.includes(pet)) {
          return client.errNormal(
            {
              error: `That pet doesn't exist in the database!`,
              type: "editreply",
            },
            interaction
          );
        }

        const filtered = data.Pets.filter((target) => target !== pet);

        await Schema.findOneAndUpdate(user, {
          Pets: filtered,
        });
      }
      client.succNormal(
        {
          text: "Removed your pet",
          fields: [
            {
              name: "🐶┆Pet",
              value: `\`\`\`${pet}\`\`\``,
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
    console.error("Error in delpet profile command:", err);
    client.errNormal(
      { error: "An error occurred while removing the pet.", type: "editreply" },
      interaction
    );
  }
};
