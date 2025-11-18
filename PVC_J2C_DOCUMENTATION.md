# 🎙️ PVC & J2C System Documentation

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Economy System](#economy-system)
4. [Voice Channel Types](#voice-channel-types)
5. [User Commands](#user-commands)
6. [Admin Commands](#admin-commands)
7. [Configuration Commands](#configuration-commands)
8. [Database Models](#database-models)
9. [Setup Guide](#setup-guide)

---

## Overview

The **PVC (Private Voice Channel)** and **J2C (Join to Create)** system is a comprehensive voice channel management and economy system that allows users to create and manage temporary voice channels using an in-bot economy.

### Key Features

- 💰 **Economy System** - Earn and spend coins for voice channels
- 🎯 **Two VC Types** - Paid (fixed duration) and PAYG (Pay-As-You-Go)
- 🔒 **Full Control** - Lock, hide, rename, invite/uninvite users
- ⏰ **Auto-Management** - Automatic expiry and billing
- 🎁 **Level Rewards** - Earn coins by leveling up
- 📊 **Statistics** - Track earnings, spending, and gifting

---

## System Architecture

### Components

```
PVC System
├── Economy Module
│   ├── Work Command (!work)
│   ├── Daily Rewards (!daily)
│   ├── Balance (!bal)
│   └── Gift System (!give)
├── Voice Management
│   ├── Create VC (!create)
│   ├── Extend Time (!extend)
│   ├── Rename (!rename)
│   └── Delete VC (!delete)
├── Access Control
│   ├── Invite Users (!vi / !invite)
│   ├── Uninvite Users (!vui / !uninvite)
│   └── Transfer Ownership (!transfer)
├── Admin Tools
│   ├── Add Coins (!addcoins)
│   ├── Remove Coins (!removecoins)
│   └── Reset Coins (!resetcoins)
└── Automation
    ├── Timer System (billing & expiry)
    ├── J2C Trigger (auto-create on join)
    └── Level Rewards (auto-grant coins)
```

---

## Economy System

### Earning Coins

#### 1. Work Command - `!work`

- Earn random coins by working
- **Default**: 1000-3000 coins per use
- **Cooldown**: 10 minutes (configurable)
- **Location**: Only works in designated economy channel

**Jobs Available:**

- Programmer 💻
- Hacker 🖥️
- Content Creator 🎥
- Graphic Designer 🎨
- Discord Moderator 🛡️
- And 10 more!

#### 2. Daily Rewards - `!daily`

- Claim daily bonus coins
- **Default**: 500-1500 coins
- **Cooldown**: 24 hours
- **Location**: Only works in designated economy channel

#### 3. Level Rewards (Automatic)

When users level up, they automatically receive PVC coins:

- **Every Level**: Base reward (default: 1000 coins)
- **Levels 10, 20, 30...**: Milestone bonus (default: 5000 coins)
- **Level 50**: Special milestone (default: 25000 coins)
- **Levels 100, 200...**: Major milestone (default: 100000 coins)

### Spending Coins

#### Voice Channel Pricing

- **Hourly Rate**: Default 3600 coins/hour (60 coins/minute)
- **Minimum Duration**: 30 minutes
- **PAYG Rate**: Calculated automatically (hourly rate ÷ 60)

**Example Costs:**

- 30 minutes = 1800 coins
- 1 hour = 3600 coins
- 2 hours = 7200 coins
- 3 hours = 10800 coins

---

## Voice Channel Types

### 1. Paid Voice Channels (Fixed Duration)

Created with `!create <duration>`

**Features:**

- Pre-pay for fixed duration
- No additional charges
- Auto-deletes when time expires
- Can extend time with `!extend`

**Example:**

```
!create 2hrs
```

- **Cost**: ~7200 coins
- **Duration**: Exactly 2 hours
- **Expiry**: Auto-delete after 2 hours

### 2. PAYG Voice Channels (Join to Create)

Created automatically when joining J2C channel

**Features:**

- Pay-per-minute billing
- Charges while you're in the VC
- No upfront cost
- Auto-deletes when empty
- Locked by default (only owner can join initially)

**Billing:**

- **Rate**: 60 coins/minute (default)
- **Frequency**: Charged every 60 seconds
- **Warning**: Notified when balance is low
- **Kick**: Disconnected if balance reaches 0

---

## User Commands

### Economy Commands

All economy commands work in the designated economy channel only.

| Command                | Aliases    | Description                 | Cooldown |
| ---------------------- | ---------- | --------------------------- | -------- |
| `!work`                | -          | Work to earn random coins   | 10 mins  |
| `!daily`               | -          | Claim daily reward          | 24 hours |
| `!bal`                 | `!balance` | View your coin balance      | None     |
| `!bal @user`           | -          | View another user's balance | None     |
| `!give @user <amount>` | `!gift`    | Gift coins to another user  | None     |

**Balance Display Shows:**

- 💰 Current Balance
- 📊 Total Earned
- 💸 Total Spent
- 🎁 Total Gifted
- 📥 Total Received
- 💎 Hours of VC time available

### Voice Channel Management

#### Creating VCs

**Paid VC (Fixed Duration):**

```
!create <duration>
```

**Duration Formats:**

- `30min` or `30m` - 30 minutes
- `1hr` or `1hour` - 1 hour
- `2hrs` or `2hours` - 2 hours
- `1.5hr` - 1.5 hours (90 minutes)

**PAYG VC (Auto-create):**
Just join the "Join to Create" channel!

#### Managing Your VC

| Command              | Aliases     | Description                        |
| -------------------- | ----------- | ---------------------------------- |
| `!extend <duration>` | -           | Add more time to your VC           |
| `!rename <name>`     | -           | Change your VC name                |
| `!delete`            | `!deletevc` | Delete your VC manually            |
| `!transfer @user`    | -           | Transfer ownership to another user |

**Examples:**

```
!extend 1hr           # Add 1 hour (costs 3600 coins)
!rename Gaming Zone   # Rename to "Gaming Zone"
!transfer @friend     # Give ownership to friend
```

#### Access Control

| Command              | Aliases     | Description             |
| -------------------- | ----------- | ----------------------- |
| `!vi @user1 @user2`  | `!invite`   | Invite users to your VC |
| `!vui @user1 @user2` | `!uninvite` | Remove users' access    |

**Examples:**

```
!vi @john @jane       # Invite John and Jane
!invite @mike         # Invite Mike
!vui @john            # Remove John's access
```

**Note:** Invited users can:

- ✅ Join your VC
- ✅ Speak in your VC
- ✅ Stream in your VC
- ❌ Cannot manage the channel

---

## Admin Commands

### Coin Management

#### Add Coins

```
!addcoins @user <amount>      # Add to single user
!addcoins @role <amount>      # Add to all users with role
```

**Examples:**

```
!addcoins @john 5000          # Give John 5000 coins
!addcoins @VIP 10000          # Give everyone with VIP role 10000 coins
```

**Features:**

- ✅ Supports users and roles
- ✅ Updates TotalEarned stat
- ✅ Shows new balance
- ✅ Skips bots automatically
- ✅ Admin-only permission

#### Remove Coins

```
!removecoins @user <amount>   # Remove from single user
!removecoins @role <amount>   # Remove from all users with role
```

**Examples:**

```
!removecoins @john 500        # Remove 500 coins from John
!removecoins @Muted 1000      # Remove 1000 coins from all Muted users
```

**Features:**

- ✅ Can go negative
- ✅ Supports users and roles
- ✅ Shows previous and new balance
- ✅ Skips bots automatically

#### Reset Coins

```
!resetcoins @user             # Reset single user to 0
!resetcoins @role             # Reset all users with role to 0
!resetcoins everyone          # Reset EVERYONE (with confirmation)
```

**Examples:**

```
!resetcoins @john             # Reset John's coins to 0
!resetcoins @Banned           # Reset all Banned users to 0
!resetcoins everyone          # Reset entire server (requires confirmation)
```

**Safety Features:**

- ⚠️ `!resetcoins everyone` requires button confirmation
- ⏱️ 30-second timeout for confirmation
- 📊 Shows total users reset

---

## Configuration Commands

All configuration is done via slash commands: `/config <subcommand>`

### PVC-Specific Configuration

#### 1. Set Economy Channel

```
/config pvc-economy-channel channel:#channel
```

**Sets where all economy commands work.**

#### 2. Set Work Cooldown

```
/config pvc-work-cooldown minutes:10
```

- **Range**: 1-60 minutes
- **Default**: 10 minutes

#### 3. Set Pricing

```
/config pvc-pricing coins:3600
```

- **Minimum**: 1000 coins
- **Default**: 3600 coins/hour
- **Auto-calculates**: PAYG rate (hourly ÷ 60)

#### 4. Set Work Rewards

```
/config pvc-work-rewards minimum:1000 maximum:3000
```

- **Minimum**: At least 100 coins
- **Sets**: Random reward range for `!work`

#### 5. Set Daily Rewards

```
/config pvc-daily-rewards minimum:500 maximum:1500
```

- **Minimum**: At least 100 coins
- **Sets**: Random reward range for `!daily`

#### 6. Set Level Rewards

```
/config pvc-level-rewards type:base amount:1000
/config pvc-level-rewards type:milestone10 amount:5000
/config pvc-level-rewards type:milestone50 amount:25000
/config pvc-level-rewards type:milestone100 amount:100000
```

**Reward Types:**

- `base` - Every level
- `milestone10` - Levels 10, 20, 30, 40, 60, 70, 80, 90...
- `milestone50` - Level 50 only
- `milestone100` - Levels 100, 200, 300...

#### 7. View Configuration

```
/config pvc-view
```

Shows all current PVC settings.

#### 8. Setup Control Panel

```
/config pvc-panel channel:#channel
```

Posts an interactive control panel for VC management (buttons for lock, hide, invite, etc.)

---

## Database Models

### pvcEconomy

Stores user economy data.

```javascript
{
  Guild: String,           // Server ID
  User: String,            // User ID
  Coins: Number,           // Current balance
  LastWork: Date,          // Last !work usage
  LastDaily: Date,         // Last !daily claim
  TotalEarned: Number,     // Lifetime earnings
  TotalSpent: Number,      // Lifetime spending
  TotalGifted: Number,     // Total gifted to others
  TotalReceived: Number,   // Total received from others
  CreatedAt: Date          // Account creation
}
```

### pvcConfig

Stores server PVC configuration.

```javascript
{
  Guild: String,              // Server ID
  EconomyChannel: String,     // Channel for economy commands
  PanelChannel: String,       // Channel for control panel
  WorkCooldown: Number,       // Cooldown in ms (default: 600000)
  WorkMin: Number,            // Min work reward (default: 1000)
  WorkMax: Number,            // Max work reward (default: 3000)
  DailyMin: Number,           // Min daily reward (default: 500)
  DailyMax: Number,           // Max daily reward (default: 1500)
  HourlyPrice: Number,        // Coins per hour (default: 3600)
  PAYGPerMinute: Number,      // Auto: HourlyPrice / 60
  LevelRewardsEnabled: Bool,  // Enable level rewards
  BaseLevelReward: Number,    // Coins per level
  Milestone10: Number,        // Bonus every 10 levels
  Milestone50: Number,        // Bonus at level 50
  Milestone100: Number,       // Bonus every 100 levels
  MinimumDuration: Number     // Min VC duration in minutes
}
```

### voiceChannels

Stores active voice channel data.

```javascript
{
  Guild: String,              // Server ID
  Channel: String,            // VC channel ID
  TextChannel: String,        // Associated text channel
  Owner: String,              // Owner user ID
  CreatedAt: Date,            // Creation timestamp
  ExpiresAt: Date,            // Expiry time (null if PAYG)
  IsPAYG: Boolean,            // Pay-as-you-go mode
  IsLocked: Boolean,          // Lock status
  IsHidden: Boolean,          // Hide status
  InvitedUsers: [String],     // Array of invited user IDs
  PaidDuration: Number,       // Duration in minutes
  CoinsSpent: Number,         // Total coins spent
  LastPAYGDeduction: Date     // Last billing timestamp
}
```

---

## Setup Guide

### Step 1: Initial Setup

#### 1.1 Setup Join to Create System

```
/autosetup customvoice
```

This creates:

- A category for PVC channels
- A "Join to Create" trigger channel
- Basic voice channel configuration

#### 1.2 Configure Economy Channel

```
/config pvc-economy-channel channel:#economy
```

Replace `#economy` with your desired channel.

#### 1.3 (Optional) Setup Control Panel

```
/config pvc-panel channel:#pvc-control
```

Creates an interactive button panel for users.

### Step 2: Configure Pricing & Rewards

#### 2.1 Set Hourly Pricing

```
/config pvc-pricing coins:3600
```

Adjust based on your economy balance.

#### 2.2 Set Work Rewards

```
/config pvc-work-rewards minimum:1000 maximum:3000
```

#### 2.3 Set Daily Rewards

```
/config pvc-daily-rewards minimum:500 maximum:1500
```

#### 2.4 Set Work Cooldown

```
/config pvc-work-cooldown minutes:10
```

### Step 3: Configure Level Rewards

```
/config pvc-level-rewards type:base amount:1000
/config pvc-level-rewards type:milestone10 amount:5000
/config pvc-level-rewards type:milestone50 amount:25000
/config pvc-level-rewards type:milestone100 amount:100000
```

### Step 4: Verify Configuration

```
/config pvc-view
```

Review all settings.

### Step 5: Test the System

#### Test as Admin:

1. Join the "Join to Create" channel
2. Check if PAYG VC was created
3. Test `!work` in economy channel
4. Test `!bal` to view balance
5. Test `!create 30min` to create paid VC

#### Test coin commands:

```
!addcoins @yourself 10000
!bal
!create 1hr
```

---

## System Behavior

### Automatic Timers

#### Timer Runs Every 60 Seconds:

**For Paid VCs:**

- ✅ Checks if VC has expired
- ✅ Deletes expired VCs
- ✅ Notifies owner via DM
- ✅ Updates channel count

**For PAYG VCs:**

- ✅ Deducts coins per minute while occupied
- ✅ Warns user when balance is low
- ✅ Kicks user when balance reaches 0
- ✅ Deletes VC when empty

### Auto-Deletion Triggers

VCs are automatically deleted when:

1. ⏰ **Time expires** (Paid VCs only)
2. 👥 **Channel is empty** (All VCs)
3. 💰 **Balance reaches 0** (PAYG VCs only)
4. 🗑️ **Owner manually deletes** with `!delete`

### Level Reward System

When a user levels up:

1. System detects level-up event
2. Calculates applicable rewards:
   - Base reward (always)
   - Milestone 10 (if level % 10 === 0)
   - Milestone 50 (if level === 50)
   - Milestone 100 (if level % 100 === 0)
3. Adds coins to user's balance
4. Updates TotalEarned stat
5. Sends notification (if configured)

**Example Level 50:**

- Base: 1000 coins
- Milestone 10: 5000 coins
- Milestone 50: 25000 coins
- **Total**: 31000 coins

---

## Best Practices

### For Server Owners

1. **Balance Your Economy**

   - Set work rewards based on VC pricing
   - Make 1 hour of VC = ~2-3 work cycles
   - Adjust daily rewards to encourage daily activity

2. **Channel Organization**

   - Create dedicated economy channel
   - Post control panel in visible location
   - Keep J2C channel at top of category

3. **Monitor Usage**

   - Check active VCs regularly
   - Review user balances periodically
   - Adjust pricing based on demand

4. **Prevent Abuse**
   - Set minimum gift amount (default: 100)
   - Use role-based rewards strategically
   - Monitor for coin farming

### For Users

1. **Earning Tips**

   - Use `!work` on cooldown
   - Never miss `!daily` rewards
   - Level up to earn milestone bonuses

2. **VC Management**

   - Create PAYG for short sessions
   - Create Paid for long sessions
   - Invite friends to share costs

3. **Saving Coins**
   - Plan VC duration carefully
   - Use `!extend` only when needed
   - Gift strategically

---

## Troubleshooting

### Common Issues

#### "Economy commands don't work"

- ✅ Check if economy channel is configured
- ✅ Verify you're in the correct channel
- ✅ Use `/config pvc-view` to see settings

#### "Can't create VC - insufficient balance"

- ✅ Check balance with `!bal`
- ✅ Use `!work` and `!daily` to earn
- ✅ Verify VC pricing with `/config pvc-view`

#### "VC was deleted too early"

- ✅ Check expiry time when created
- ✅ For PAYG: ensure sufficient balance
- ✅ Timer runs every 60 seconds (slight delay normal)

#### "Level rewards not working"

- ✅ Verify levels are enabled: `/config levels boolean:True`
- ✅ Check PVC config: `/config pvc-view`
- ✅ Ensure economy channel is set

### Admin Troubleshooting

#### Reset User Economy

```
!resetcoins @user
!addcoins @user 5000
```

#### Force Delete Stuck VC

Manually delete the channel, then verify database with developer tools.

#### Check Timer Status

Look for console logs:

```
[PVC Timer] Deducted X coins from user Y (PAYG)
[PVC Timer] Deleted expired VC: Channel Name
```

---

## Advanced Features

### Coin Gifting

Users can gift coins to each other:

```
!give @friend 1000
```

**Restrictions:**

- ❌ Cannot gift to self
- ❌ Cannot gift to bots
- ❌ Minimum: 100 coins
- ✅ Updates both users' stats

### VC Transfer

Users can transfer VC ownership:

```
!transfer @friend
```

**Requirements:**

- ✅ Must own the VC
- ✅ Target cannot have active VC
- ✅ Target cannot be a bot
- ✅ Updates permissions automatically

### Bulk Admin Operations

```
!addcoins @VIP 5000          # All VIP members get 5000
!removecoins @Muted 1000     # All muted lose 1000
!resetcoins @Banned          # All banned reset to 0
```

---

## API Integration Points

### Events Triggered

```javascript
// When VC is created
client.emit("pvcCreated", { guild, channel, owner, type: "paid" | "payg" });

// When VC expires
client.emit("pvcExpired", { guild, channel, owner });

// When user earns coins
client.emit("pvcEarned", {
  guild,
  user,
  amount,
  source: "work" | "daily" | "level",
});

// When user spends coins
client.emit("pvcSpent", {
  guild,
  user,
  amount,
  purpose: "create" | "extend" | "payg",
});
```

### Webhook Integration

Configure webhooks for:

- VC creation notifications
- Large coin transactions
- Daily summaries
- Admin actions

---

## Statistics & Analytics

### User Statistics

Viewable with `!bal`:

- Current balance
- Total earned (all sources)
- Total spent (VCs)
- Total gifted (to others)
- Total received (gifts)
- VC time available

### Server Statistics

Track via developer tools:

- Total coins in circulation
- Average user balance
- Most active earners
- Most active spenders
- Total VCs created
- Total hours purchased

---

## Future Enhancements

### Planned Features

- 🎯 VC templates (pre-configured settings)
- 🏆 Leaderboards (richest users, most VCs created)
- 📊 Statistics dashboard
- 🎁 Seasonal events with bonus rewards
- 💎 Premium VC features (larger capacity, permanent channels)
- 🔔 Expiry reminders (DM before VC expires)
- 📱 Mobile control panel
- 🎮 Integration with games for bonus coins

---

## Support & Credits

### Getting Help

1. Use `/config help` for command help
2. Check this documentation
3. Contact server administrators
4. Report bugs via GitHub issues

### Credits

- **Original System**: Dotwood Media & Graphix Development
- **PVC System**: Sanat
- **Documentation**: AI-Assisted (Claude)

---

**Last Updated**: November 18, 2025
**Version**: 10.0.0
**System**: PVC & J2C Economy System
