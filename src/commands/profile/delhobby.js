const Schema = require("../../database/models/profile");

module.exports = async (client, interaction, args) => {
  const hobby = interaction.options.getString("hobby");
  const user = { User: interaction.user.id };

  try {
    const data = await Schema.findOne({ User: interaction.user.id });

    if (data) {
      if (data && data.Hobbys) {
        if (!data.Hobbys.includes(hobby)) {
          return client.errNormal(
            {
              error: `That hobby doesn't exist in the database!`,
              type: "editreply",
            },
            interaction
          );
        }

        const filtered = data.Hobbys.filter((target) => target !== hobby);

        await Schema.findOneAndUpdate(user, {
          Hobbys: filtered,
        });
      }
      client.succNormal(
        {
          text: "Removed your hobby",
          fields: [
            {
              name: "⚽┆Hobby",
              value: `\`\`\`${hobby}\`\`\``,
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
    console.error("Error in delhobby profile command:", err);
    client.errNormal(
      {
        error: "An error occurred while removing the hobby.",
        type: "editreply",
      },
      interaction
    );
  }
};
