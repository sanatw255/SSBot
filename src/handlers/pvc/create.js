const Discord = require("discord.js");
const pvcEconomy = require("../../database/models/pvcEconomy");
const pvcConfig = require("../../database/models/pvcConfig");
const voiceChannels = require("../../database/models/voiceChannels");
const voiceSchema = require("../../database/models/voice");

module.exports = async (client, message, args) => {
  // Ignore bots
  if (message.author.bot) return;

  try {
    // Check if PVC commands channel is configured
    const config = await pvcConfig.findOne({ Guild: message.guild.id });

    if (!config || !config.CommandsChannel) {
      return; // Silently ignore if not configured
    }

    // Check if command is in the correct channel
    if (message.channel.id !== config.CommandsChannel) {
      return; // Silently ignore if wrong channel
    }

    // Check if user already has an active VC
    const existingVC = await voiceChannels.findOne({
      Guild: message.guild.id,
      Owner: message.author.id,
    });

    if (existingVC) {
      const vcChannel = message.guild.channels.cache.get(existingVC.Channel);
      const embed = new Discord.EmbedBuilder()
        .setColor(client.config.colors.error || "#FF0000")
        .setTitle("❌ Already Have Active VC")
        .setDescription(
          `You already have an active voice channel!\n\n` +
            `**Your VC**: ${vcChannel || "Unknown Channel"}\n` +
            `**Mode**: ${existingVC.IsPAYG ? "Pay-As-You-Go" : "Paid"}\n\n` +
            `Use \`!extend <duration>\` to add more time, or \`!delete\` to remove it.`
        )
        .setFooter({
          text: message.guild.name,
          iconURL: message.guild.iconURL(),
        });

      return message.reply({ embeds: [embed] }).then((msg) => {
        setTimeout(() => msg.delete().catch(() => {}), 10000);
      });
    }

    // Parse duration argument
    if (!args[1]) {
      const embed = new Discord.EmbedBuilder()
        .setColor(client.config.colors.error || "#FF0000")
        .setTitle("❌ Invalid Usage")
        .setDescription(
          `Please specify a duration!\n\n` +
            `**Usage**: \`!create <duration>\`\n` +
            `**Examples**:\n` +
            `• \`!create 30min\` - 30 minutes (${Math.floor(
              config.HourlyPrice / 2
            ).toLocaleString()} coins)\n` +
            `• \`!create 1hr\` - 1 hour (${config.HourlyPrice.toLocaleString()} coins)\n` +
            `• \`!create 2hrs\` - 2 hours (${(
              config.HourlyPrice * 2
            ).toLocaleString()} coins)\n\n` +
            `**Minimum**: ${config.MinimumDuration} minutes`
        )
        .setFooter({
          text: message.guild.name,
          iconURL: message.guild.iconURL(),
        });

      return message.reply({ embeds: [embed] }).then((msg) => {
        setTimeout(() => msg.delete().catch(() => {}), 10000);
      });
    }

    // Parse duration
    const durationArg = args[1].toLowerCase();
    let durationMinutes = 0;

    if (durationArg.includes("hr") || durationArg.includes("hour")) {
      const hours = parseFloat(durationArg.replace(/[^0-9.]/g, ""));
      durationMinutes = hours * 60;
    } else if (durationArg.includes("min") || durationArg.includes("m")) {
      durationMinutes = parseInt(durationArg.replace(/[^0-9]/g, ""));
    } else {
      const embed = new Discord.EmbedBuilder()
        .setColor(client.config.colors.error || "#FF0000")
        .setTitle("❌ Invalid Duration Format")
        .setDescription(
          `Please use a valid duration format!\n\n` +
            `**Examples**: \`30min\`, \`1hr\`, \`2hrs\`, \`1.5hr\``
        )
        .setFooter({
          text: message.guild.name,
          iconURL: message.guild.iconURL(),
        });

      return message.reply({ embeds: [embed] }).then((msg) => {
        setTimeout(() => msg.delete().catch(() => {}), 5000);
      });
    }

    // Validate minimum duration
    if (durationMinutes < config.MinimumDuration) {
      const embed = new Discord.EmbedBuilder()
        .setColor(client.config.colors.error || "#FF0000")
        .setTitle("❌ Duration Too Short")
        .setDescription(
          `Minimum duration is **${config.MinimumDuration} minutes**!`
        )
        .setFooter({
          text: message.guild.name,
          iconURL: message.guild.iconURL(),
        });

      return message.reply({ embeds: [embed] }).then((msg) => {
        setTimeout(() => msg.delete().catch(() => {}), 5000);
      });
    }

    // Calculate cost
    const cost = Math.ceil((durationMinutes / 60) * config.HourlyPrice);

    // Get user's balance
    let userData = await pvcEconomy.findOne({
      Guild: message.guild.id,
      User: message.author.id,
    });

    if (!userData) {
      userData = await new pvcEconomy({
        Guild: message.guild.id,
        User: message.author.id,
        Coins: 0,
      }).save();
    }

    // Check if user has enough coins
    if (userData.Coins < cost) {
      const embed = new Discord.EmbedBuilder()
        .setColor(client.config.colors.error || "#FF0000")
        .setTitle("❌ Insufficient Balance")
        .setDescription(
          `You don't have enough coins!\n\n` +
            `**Cost**: ${cost.toLocaleString()} coins\n` +
            `**Your Balance**: ${userData.Coins.toLocaleString()} coins\n` +
            `**Needed**: ${(cost - userData.Coins).toLocaleString()} more coins`
        )
        .setFooter({
          text: "Use !work and !daily to earn coins!",
          iconURL: message.guild.iconURL(),
        });

      return message.reply({ embeds: [embed] }).then((msg) => {
        setTimeout(() => msg.delete().catch(() => {}), 10000);
      });
    }

    // Get J2C voice setup data
    const voiceData = await voiceSchema.findOne({ Guild: message.guild.id });
    if (!voiceData || !voiceData.Category) {
      const embed = new Discord.EmbedBuilder()
        .setColor(client.config.colors.error || "#FF0000")
        .setTitle("❌ PVC System Not Set Up")
        .setDescription(
          `The PVC system hasn't been configured yet!\n\n` +
            `An administrator needs to run \`/autosetup customvoice\` first.`
        )
        .setFooter({
          text: message.guild.name,
          iconURL: message.guild.iconURL(),
        });

      return message.reply({ embeds: [embed] }).then((msg) => {
        setTimeout(() => msg.delete().catch(() => {}), 10000);
      });
    }

    // Create the voice channel
    const category = message.guild.channels.cache.get(voiceData.Category);
    if (!category) {
      return message
        .reply("❌ PVC category not found! Please contact an administrator.")
        .catch(() => {});
    }

    // Send creating message
    const creatingMsg = await message.reply(
      "🔄 Creating your private voice channel..."
    );

    try {
      // Create voice channel
      const voiceChannel = await message.guild.channels.create({
        name: `${message.author.username}'s VC`,
        type: Discord.ChannelType.GuildVoice,
        parent: category.id,
        userLimit: 0, // Unlimited
        permissionOverwrites: [
          {
            id: message.guild.id, // @everyone
            deny: [Discord.PermissionFlagsBits.Connect],
          },
          {
            id: message.author.id,
            allow: [
              Discord.PermissionFlagsBits.Connect,
              Discord.PermissionFlagsBits.Speak,
              Discord.PermissionFlagsBits.Stream,
              Discord.PermissionFlagsBits.ManageChannels,
            ],
          },
        ],
      });

      // Calculate expiry time
      const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

      // Save to database
      await new voiceChannels({
        Guild: message.guild.id,
        Channel: voiceChannel.id,
        TextChannel: null, // Will be set when user joins
        Owner: message.author.id,
        CreatedAt: new Date(),
        ExpiresAt: expiresAt,
        IsPAYG: false,
        IsLocked: false,
        IsHidden: false,
        InvitedUsers: [],
        PaidDuration: durationMinutes,
        CoinsSpent: cost,
      }).save();

      // Deduct coins
      userData.Coins -= cost;
      userData.TotalSpent += cost;
      await userData.save();

      // Update channel count
      if (voiceData.ChannelCount !== undefined) {
        voiceData.ChannelCount += 1;
        await voiceData.save();
      }

      // Determine control panel channel
      const controlPanelChannel = config.PanelChannel || config.EconomyChannel;
      const controlPanelText = config.PanelChannel
        ? `Use the control panel in <#${config.PanelChannel}> to manage your VC`
        : `Use !commands in <#${config.EconomyChannel}> to manage your VC`;

      // Success message
      const embed = new Discord.EmbedBuilder()
        .setColor(client.config.colors.success || "#00FF00")
        .setTitle("✅ Private VC Created!")
        .setDescription(
          `Your private voice channel has been created successfully!`
        )
        .addFields(
          { name: "🎙️ Channel", value: `${voiceChannel}`, inline: true },
          {
            name: "⏱️ Duration",
            value: `${durationMinutes} minutes`,
            inline: true,
          },
          {
            name: "💰 Cost",
            value: `${cost.toLocaleString()} coins`,
            inline: true,
          },
          {
            name: "🏦 Remaining Balance",
            value: `${userData.Coins.toLocaleString()} coins`,
            inline: true,
          },
          {
            name: "⏰ Expires At",
            value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>`,
            inline: true,
          },
          {
            name: "📝 Control Panel",
            value: controlPanelText,
            inline: false,
          }
        )
        .setFooter({
          text: "Join the channel to activate it!",
          iconURL: message.guild.iconURL(),
        })
        .setTimestamp();

      await creatingMsg.edit({ content: null, embeds: [embed] });
    } catch (err) {
      console.error("Error creating VC:", err);
      await creatingMsg.edit(
        "❌ Failed to create voice channel! Please contact an administrator."
      );
    }
  } catch (err) {
    console.error("Error in PVC create command:", err);
    message
      .reply("❌ An error occurred while creating your VC.")
      .catch(() => {});
  }
};
