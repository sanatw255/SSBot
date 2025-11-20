// Track rename cooldowns to prevent Discord rate limits
// Discord limits: 2 channel name changes per 10 minutes
const renameCooldowns = new Map();

module.exports = {
  // Check if channel can be renamed
  canRename(channelId) {
    const now = Date.now();
    const cooldownTime = 5 * 60 * 1000; // 5 minutes (conservative)

    if (renameCooldowns.has(channelId)) {
      const lastRename = renameCooldowns.get(channelId);
      const timeLeft = cooldownTime - (now - lastRename);

      if (timeLeft > 0) {
        return { allowed: false, timeLeft };
      }
    }

    return { allowed: true, timeLeft: 0 };
  },

  // Set cooldown after successful rename
  setRenameCooldown(channelId) {
    renameCooldowns.set(channelId, Date.now());
  },

  // Clear cooldown (used when channel is deleted)
  clearCooldown(channelId) {
    renameCooldowns.delete(channelId);
  },

  // Get time remaining in minutes
  getTimeLeft(channelId) {
    const check = this.canRename(channelId);
    return check.allowed ? 0 : Math.ceil(check.timeLeft / 60000);
  },
};
