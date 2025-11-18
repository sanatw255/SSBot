const Discord = require("discord.js");

// Import PVC handlers
const workHandler = require("../../handlers/pvc/work");
const dailyHandler = require("../../handlers/pvc/daily");
const balanceHandler = require("../../handlers/pvc/balance");
const giveHandler = require("../../handlers/pvc/give");
const addcoinsHandler = require("../../handlers/pvc/addcoins");
const resetcoinsHandler = require("../../handlers/pvc/resetcoins");
const removecoinsHandler = require("../../handlers/pvc/removecoins");
const createHandler = require("../../handlers/pvc/create");
const extendHandler = require("../../handlers/pvc/extend");
const inviteHandler = require("../../handlers/pvc/invite");
const uninviteHandler = require("../../handlers/pvc/uninvite");
const deleteHandler = require("../../handlers/pvc/delete");
const renameHandler = require("../../handlers/pvc/rename");
const transferHandler = require("../../handlers/pvc/transfer");

module.exports = async (client, message) => {
  // Ignore bots and DMs
  if (message.author.bot || !message.guild) return;

  // Check for PVC prefix commands
  const content = message.content.toLowerCase();

  // Split message into command and args
  const args = message.content.trim().split(/\s+/);
  const command = args[0].toLowerCase();

  try {
    // PVC Economy Commands
    if (command === "!work") {
      await workHandler(client, message, args);
    } else if (command === "!daily") {
      await dailyHandler(client, message, args);
    } else if (command === "!bal" || command === "!balance") {
      await balanceHandler(client, message, args);
    } else if (command === "!give" || command === "!gift") {
      await giveHandler(client, message, args);
    } else if (command === "!addcoins") {
      await addcoinsHandler(client, message, args);
    } else if (command === "!resetcoins") {
      await resetcoinsHandler(client, message, args);
    } else if (command === "!removecoins") {
      await removecoinsHandler(client, message, args);
    }
    // PVC VC Management Commands
    else if (command === "!create") {
      await createHandler(client, message, args);
    } else if (command === "!extend") {
      await extendHandler(client, message, args);
    } else if (command === "!vi" || command === "!invite") {
      await inviteHandler(client, message, args);
    } else if (command === "!vui" || command === "!uninvite") {
      await uninviteHandler(client, message, args);
    } else if (command === "!delete" || command === "!deletevc") {
      await deleteHandler(client, message, args);
    } else if (command === "!rename") {
      await renameHandler(client, message, args);
    } else if (command === "!transfer") {
      await transferHandler(client, message, args);
    }
  } catch (err) {
    console.error("Error in PVC message handler:", err);
  }
};
