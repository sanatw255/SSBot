const Schema = require("../../database/models/profile");

module.exports = async (client, interaction, args) => {
  const pet = interaction.options.getString("pet");

  try {
    const data = await Schema.findOne({ User: interaction.user.id });

    if (data) {
      if (data && data.Pets) {
        if (data.Pets.includes(pet)) {
          return client.errNormal(
            {
              error: `That pet is already exists in your database!`,
              type: "editreply",
            },
            interaction
          );
        }
        data.Pets.push(pet);
        await data.save();
      } else {
        data.Pets = pet;
        await data.save();
      }
      client.succNormal(
        {
          text: "Added your pet",
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
    console.error("Error in addpet profile command:", err);
    client.errNormal(
      { error: "An error occurred while adding the pet.", type: "editreply" },
      interaction
    );
  }
};
