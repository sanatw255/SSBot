const Schema = require("../../database/models/profile");

module.exports = async (client, interaction, args) => {
  const movie = interaction.options.getString("movie");

  try {
    const data = await Schema.findOne({ User: interaction.user.id });

    if (data) {
      if (data && data.Movies) {
        if (data.Movies.includes(movie)) {
          return client.errNormal(
            {
              error: `That movie is already exists in your database!`,
              type: "editreply",
            },
            interaction
          );
        }
        data.Movies.push(movie);
        await data.save();
      } else {
        data.Movies = movie;
        await data.save();
      }
      client.succNormal(
        {
          text: "Added your movie",
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
    console.error("Error in addmovie profile command:", err);
    client.errNormal(
      { error: "An error occurred while adding the movie.", type: "editreply" },
      interaction
    );
  }
};
