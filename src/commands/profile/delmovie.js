const Schema = require("../../database/models/profile");

module.exports = async (client, interaction, args) => {
  const movie = interaction.options.getString("movie");
  const user = { User: interaction.user.id };

  try {
    const data = await Schema.findOne({ User: interaction.user.id });

    if (data) {
      if (data && data.Movies) {
        if (!data.Movies.includes(movie)) {
          return client.errNormal(
            {
              error: `That movie doesn't exist in the database!`,
              type: "editreply",
            },
            interaction
          );
        }

        const filtered = data.Movies.filter((target) => target !== movie);

        await Schema.findOneAndUpdate(user, {
          Movies: filtered,
        });
      }
      client.succNormal(
        {
          text: "Removed your movie",
          fields: [
            {
              name: "🎬┆Movies",
              value: `\`\`\`${movie}\`\`\``,
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
    console.error("Error in delmovie profile command:", err);
    client.errNormal(
      {
        error: "An error occurred while removing the movie.",
        type: "editreply",
      },
      interaction
    );
  }
};
