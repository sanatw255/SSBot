const Discord = require("discord.js");
const Schema = require("../../database/models/levelRewards");

module.exports = async (client, interaction, args) => {
  const level = interaction.options.getNumber("level");
  const role = interaction.options.getRole("role");

  const perms = await client.checkUserPerms(
    {
      flags: [Discord.PermissionsBitField.Flags.ManageMessages],
      perms: [Discord.PermissionsBitField.Flags.ManageMessages],
    },
    interaction
  );

  if (perms == false) return;

  try {
    const existingReward = await Schema.findOne({
      Guild: interaction.guild.id,
      Level: level,
    });

    if (existingReward) {
      return client.errNormal(
        {
          error: "This level already has a reward!",
          type: "editreply",
        },
        interaction
      );
    }

    const newReward = new Schema({
      Guild: interaction.guild.id,
      Level: level,
      Role: role.id,
    });

    await newReward.save();

    client.succNormal(
      {
        text: `Level reward created successfully!`,
        fields: [
          {
            name: "🆙┆Level",
            value: `${level}`,
            inline: true,
          },
          {
            name: "📘┆Role",
            value: `${role}`,
            inline: true,
          },
        ],
        type: "editreply",
      },
      interaction
    );
  } catch (error) {
    console.error("Error creating level reward:", error);
    client.errNormal(
      {
        error: "Failed to create level reward",
        type: "editreply",
      },
      interaction
    );
  }
};
