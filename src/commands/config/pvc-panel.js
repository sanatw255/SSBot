const Discord = require("discord.js");
const pvcConfig = require("../../database/models/pvcConfig");

module.exports = async (client, interaction, args) => {
  const perms = await client.checkUserPerms(
    {
      flags: [Discord.PermissionsBitField.Flags.ManageGuild],
      perms: [Discord.PermissionsBitField.Flags.ManageGuild],
    },
    interaction
  );

  if (perms == false) return;

  const channel = interaction.options.getChannel("channel");

  if (!channel) {
    return client.errNormal(
      {
        error: "Please provide a valid channel!",
        type: "editreply",
      },
      interaction
    );
  }

  const guildID = interaction.guild.id;

  // Save panel channel to config
  let config = await pvcConfig.findOne({ Guild: guildID });

  if (!config) {
    config = new pvcConfig({
      Guild: guildID,
      PanelChannel: channel.id,
    });
  } else {
    config.PanelChannel = channel.id;
  }

  await config.save();

  // Create the persistent control panel
  const embed = new Discord.EmbedBuilder()
    .setTitle(`🎙️ Private Voice Channel Control Panel`)
    .setDescription(
      `**Welcome to the PVC Control Panel!**\n\n` +
        `Use the buttons below to manage your Private Voice Channel.\n` +
        `All actions are private - only you can see your responses.\n\n` +
        `**Available Controls:**\n` +
        `⏱️ **Extend** - Add paid time to your VC\n` +
        `🟢 **Auto** - Toggle PAYG mode (60 coins/min)\n` +
        `➕ **Invite** - Grant user access to your VC\n` +
        `➖ **Uninvite** - Remove user access\n` +
        `✏️ **Rename** - Change your VC name\n` +
        `🔄 **Transfer** - Transfer ownership\n` +
        `🔒 **Lock/Unlock** - Toggle connect permission\n` +
        `👁️ **Hide/Unhide** - Toggle visibility\n` +
        `📊 **Status** - View your VC information\n` +
        `🗑️ **Delete** - Delete your voice channel\n\n` +
        `**Note:** You must own a Private Voice Channel to use these controls.`
    )
    .setColor(client.config?.embeds?.default_color || "#0099ff")
    .setFooter({
      text: `${interaction.guild.name} • PVC System`,
      iconURL: interaction.guild.iconURL({ dynamic: true }),
    })
    .setTimestamp();

  // Create buttons
  const row1 = new Discord.ActionRowBuilder().addComponents(
    new Discord.ButtonBuilder()
      .setCustomId("pvc_extend")
      .setLabel("Extend")
      .setEmoji("⏱️")
      .setStyle(Discord.ButtonStyle.Primary),

    new Discord.ButtonBuilder()
      .setCustomId("pvc_auto")
      .setLabel("Auto")
      .setEmoji("🟢")
      .setStyle(Discord.ButtonStyle.Success),

    new Discord.ButtonBuilder()
      .setCustomId("pvc_invite")
      .setLabel("Invite")
      .setEmoji("➕")
      .setStyle(Discord.ButtonStyle.Success),

    new Discord.ButtonBuilder()
      .setCustomId("pvc_uninvite")
      .setLabel("Uninvite")
      .setEmoji("➖")
      .setStyle(Discord.ButtonStyle.Danger),

    new Discord.ButtonBuilder()
      .setCustomId("pvc_rename")
      .setLabel("Rename")
      .setEmoji("✏️")
      .setStyle(Discord.ButtonStyle.Primary)
  );

  const row2 = new Discord.ActionRowBuilder().addComponents(
    new Discord.ButtonBuilder()
      .setCustomId("pvc_transfer")
      .setLabel("Transfer")
      .setEmoji("🔄")
      .setStyle(Discord.ButtonStyle.Primary),

    new Discord.ButtonBuilder()
      .setCustomId("pvc_lock")
      .setLabel("Lock/Unlock")
      .setEmoji("🔒")
      .setStyle(Discord.ButtonStyle.Secondary),

    new Discord.ButtonBuilder()
      .setCustomId("pvc_hide")
      .setLabel("Hide/Unhide")
      .setEmoji("👁️")
      .setStyle(Discord.ButtonStyle.Secondary),

    new Discord.ButtonBuilder()
      .setCustomId("pvc_status")
      .setLabel("Status")
      .setEmoji("📊")
      .setStyle(Discord.ButtonStyle.Primary),

    new Discord.ButtonBuilder()
      .setCustomId("pvc_deletevc")
      .setLabel("Delete VC")
      .setEmoji("🗑️")
      .setStyle(Discord.ButtonStyle.Danger)
  );

  // Send the panel
  await channel.send({
    embeds: [embed],
    components: [row1, row2],
  });

  // Confirm to admin
  client.succNormal(
    {
      text: `PVC Control Panel created in ${channel}!`,
      fields: [
        {
          name: `📍 Channel`,
          value: `${channel}`,
          inline: true,
        },
      ],
      type: "editreply",
    },
    interaction
  );
};
