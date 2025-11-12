const Schema = require("../../database/models/profile");

module.exports = async (client, interaction, args) => {
  const hobby = interaction.options.getString("hobby");

  try {
    const data = await Schema.findOne({ User: interaction.user.id });

    if (data) {
      if (data && data.Hobbys) {
        if (data.Hobbys.includes(hobby)) {
          return client.errNormal(
            {
              error: `That hobby is already exists in your database!`,
              type: "editreply",
            },
            interaction
          );
        }
        data.Hobbys.push(hobby);
        await data.save();
      } else {
        data.Hobbys = hobby;
        await data.save();
      }
      client.succNormal(
        {
          text: "Added your hobby",
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
    console.error("Error in addhobby profile command:", err);
    client.errNormal(
      { error: "An error occurred while adding the hobby.", type: "editreply" },
      interaction
    );
  }
};
