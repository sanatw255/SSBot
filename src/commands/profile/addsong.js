const Schema = require("../../database/models/profile");

module.exports = async (client, interaction, args) => {
  const song = interaction.options.getString("song");

  try {
    const data = await Schema.findOne({ User: interaction.user.id });

    if (data) {
      if (data && data.Songs) {
        if (data.Songs.includes(song)) {
          return client.errNormal(
            {
              error: `That song is already exists in your database!`,
              type: "editreply",
            },
            interaction
          );
        }
        data.Songs.push(song);
        await data.save();
      } else {
        data.Songs = song;
        await data.save();
      }
      client.succNormal(
        {
          text: "Added your song",
          fields: [
            {
              name: "🎶┆Song",
              value: `\`\`\`${song}\`\`\``,
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
    console.error("Error in addsong profile command:", err);
    client.errNormal(
      { error: "An error occurred while adding the song.", type: "editreply" },
      interaction
    );
  }
};
