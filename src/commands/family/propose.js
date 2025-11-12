const Discord = require("discord.js");

const Schema = require("../../database/models/family");

module.exports = async (client, interaction, args) => {
  const target = interaction.options.getUser("user");
  const author = interaction.user;
  const guild = { Guild: interaction.guild.id };

  if (author.id == target.id)
    return client.errNormal(
      { error: "You cannot marry yourself!", type: "editreply" },
      interaction
    );

  try {
    // Check if author is already married
    const authorMarriageCheck = await Schema.findOne({
      Guild: interaction.guild.id,
      Partner: author.id,
    });
    if (authorMarriageCheck) {
      return client.errNormal(
        {
          error: "Someone in the couple is already married!",
          type: "editreply",
        },
        interaction
      );
    }

    // Check if target is already married
    const targetMarriageCheck = await Schema.findOne({
      Guild: interaction.guild.id,
      Partner: target.id,
    });
    if (targetMarriageCheck) {
      return client.errNormal(
        {
          error: "Someone in the couple is already married!",
          type: "editreply",
        },
        interaction
      );
    }

    // Check if target is author's parent
    const targetIsParent = await Schema.findOne({
      Guild: interaction.guild.id,
      User: target.id,
      Parent: author.id,
    });
    if (targetIsParent) {
      return client.errNormal(
        { error: "You cannot marry a family member!", type: "editreply" },
        interaction
      );
    }

    // Check if author is target's parent
    const authorIsParent = await Schema.findOne({
      Guild: interaction.guild.id,
      User: author.id,
      Parent: target.id,
    });
    if (authorIsParent) {
      return client.errNormal(
        { error: "You cannot marry a family member!", type: "editreply" },
        interaction
      );
    }

    // Check if target is author's child
    const authorData = await Schema.findOne({
      Guild: interaction.guild.id,
      User: author.id,
    });
    if (authorData && authorData.Children.includes(target.id)) {
      return client.errNormal(
        { error: "You cannot marry a family member!", type: "editreply" },
        interaction
      );
    }

    // All checks passed, proceed with proposal
    propose();
  } catch (err) {
    console.error("Error in propose command:", err);
    client.errNormal(
      {
        error: "An error occurred while processing the marriage proposal.",
        type: "editreply",
      },
      interaction
    );
  }

  async function propose() {
    const row = new Discord.ActionRowBuilder().addComponents(
      new Discord.ButtonBuilder()
        .setCustomId("propose_accept")
        .setEmoji("✅")
        .setStyle(Discord.ButtonStyle.Success),

      new Discord.ButtonBuilder()
        .setCustomId("propose_deny")
        .setEmoji("❌")
        .setStyle(Discord.ButtonStyle.Danger)
    );

    client.embed(
      {
        title: `👰・Marriage proposal`,
        desc: `${author} has ${target} asked to propose him! \n${target} click on one of the buttons`,
        components: [row],
        content: `${target}`,
        type: "editreply",
      },
      interaction
    );

    const filter = (i) => i.user.id === target.id;

    interaction.channel
      .awaitMessageComponent({
        filter,
        componentType: Discord.ComponentType.Button,
        time: 60000,
      })
      .then(async (i) => {
        if (i.customId == "propose_accept") {
          try {
            // Update or create author's family data
            const authorData = await Schema.findOne({
              Guild: interaction.guild.id,
              User: author.id,
            });
            if (authorData) {
              authorData.Partner = target.id;
              await authorData.save();
            } else {
              await new Schema({
                Guild: interaction.guild.id,
                User: author.id,
                Partner: target.id,
              }).save();
            }

            // Update or create target's family data
            const targetData = await Schema.findOne({
              Guild: interaction.guild.id,
              User: target.id,
            });
            if (targetData) {
              targetData.Partner = author.id;
              await targetData.save();
            } else {
              await new Schema({
                Guild: interaction.guild.id,
                User: target.id,
                Partner: author.id,
              }).save();
            }

            client.embed(
              {
                title: `👰・Marriage proposal - Approved`,
                desc: `${author} and ${target} are now married! 👰🎉`,
                components: [],
                content: `${target}`,
                type: "editreply",
              },
              interaction
            );
          } catch (err) {
            console.error("Error saving marriage proposal:", err);
            client.errNormal(
              {
                error: "An error occurred while saving the marriage.",
                type: "editreply",
              },
              interaction
            );
          }
        }

        if (i.customId == "propose_deny") {
          client.embed(
            {
              title: `👰・Marriage proposal - Denied`,
              desc: `${target} loves someone else and chose not to marry ${author}`,
              components: [],
              content: `${target}`,
              type: "editreply",
            },
            interaction
          );
        }
      })
      .catch(() => {
        client.embed(
          {
            title: `👰・Marriage proposal - Denied`,
            desc: `${target} has not answered anything! The wedding is canceled`,
            components: [],
            content: `${target}`,
            type: "editreply",
          },
          interaction
        );
      });
  }
};
