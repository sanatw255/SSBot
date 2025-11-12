const Schema = require("../../database/models/profile");

module.exports = async (client, interaction, args) => {
  const food = interaction.options.getString("food");

  try {
    const data = await Schema.findOne({ User: interaction.user.id });

    if (data) {
      if (data && data.Food) {
        if (data.Food.includes(food)) {
          return client.errNormal(
            {
              error: `That food is already exists in your database!`,
              type: "editreply",
            },
            interaction
          );
        }
        data.Food.push(food);
        await data.save();
      } else {
        data.Food = food;
        await data.save();
      }
      client.succNormal(
        {
          text: "Added your food",
          fields: [
            {
              name: "🥐┆Food",
              value: `\`\`\`${food}\`\`\``,
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
    console.error("Error in addfood profile command:", err);
    client.errNormal(
      { error: "An error occurred while adding the food.", type: "editreply" },
      interaction
    );
  }
};
