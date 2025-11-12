const Schema = require("../../database/models/profile");

module.exports = async (client, interaction, args) => {
  try {
    const data = await Schema.findOne({ User: interaction.user.id });

    if (data) {
      await Schema.findOneAndDelete({ User: interaction.user.id });
      client.succNormal(
        {
          text: "Your profile was deleted!",
          type: "editreply",
        },
        interaction
      );
    } else {
      client.errNormal(
        {
          error: "No profile found!",
          type: "editreply",
        },
        interaction
      );
    }
  } catch (err) {
    console.error("Error in delete profile command:", err);
    client.errNormal(
      {
        error: "An error occurred while deleting your profile.",
        type: "editreply",
      },
      interaction
    );
  }
};
