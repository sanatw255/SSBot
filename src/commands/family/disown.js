const Discord = require("discord.js");

const Schema = require("../../database/models/family");

module.exports = async (client, interaction, args) => {
  const target = interaction.options.getUser("user");
  const author = interaction.user;
  const guild = { Guild: interaction.guild.id };

  if (author.id == target.id)
    return client.errNormal(
      {
        error: "You cannot disown yourself",
        type: "editreply",
      },
      interaction
    );

  if (target.bot)
    return client.errNormal(
      {
        error: "You cannot disown a bot",
        type: "editreply",
      },
      interaction
    );

  try {
    // Check if target is the parent (author is the child)
    const childData = await Schema.findOne({
      Guild: interaction.guild.id,
      Parent: target.id,
    });
    if (childData) {
      const parentData = await Schema.findOne({
        Guild: interaction.guild.id,
        User: childData.Parent,
      });
      if (parentData) {
        client.embed(
          {
            title: `👪・Disowned`,
            desc: `${author} has disowned <@!${childData.Parent}>`,
            type: "editreply",
          },
          interaction
        );
        childData.Parent = null;
        await childData.save();
        return;
      }
    }

    // Check if author has target as a child
    const authorData = await Schema.findOne({
      Guild: interaction.guild.id,
      User: author.id,
    });
    if (authorData) {
      if (authorData.Children.includes(target.username)) {
        const filtered = authorData.Children.filter(
          (user) => user !== target.username
        );

        await Schema.findOneAndUpdate(guild, {
          Guild: interaction.guild.id,
          User: author.id,
          Children: filtered,
        });

        const targetParentData = await Schema.findOne({
          Guild: interaction.guild.id,
          Parent: author.id,
        });
        if (targetParentData) {
          targetParentData.Parent = null;
          await targetParentData.save();
        }

        client.embed(
          {
            title: `👪・Disowned`,
            desc: `${author} has disowned <@!${target.id}>`,
            type: "editreply",
          },
          interaction
        );
      } else {
        client.errNormal(
          {
            error: "You have no children/parents at the moment",
            type: "editreply",
          },
          interaction
        );
      }
    } else {
      client.errNormal(
        {
          error: "You have no children/parents at the moment",
          type: "editreply",
        },
        interaction
      );
    }
  } catch (err) {
    console.error("Error in disown command:", err);
    client.errNormal(
      {
        error: "An error occurred while processing the disown command.",
        type: "editreply",
      },
      interaction
    );
  }
};
