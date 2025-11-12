# 🔧 VPS Restart Guide - Quick Fix

## ❌ Error You Got:

```
[PM2][ERROR] Process or Namespace bot not found
```

This means PM2 doesn't have a process called "bot" registered.

---

## ✅ Solution - Run These Commands:

### **Step 1: Check what processes are running**

```bash
pm2 list
```

This will show you all PM2 processes and their names.

---

### **Step 2A: If you see your bot in the list**

The name might be different (like "ssbot", "discord-bot", "index", etc.)

**Restart it using the correct name:**

```bash
pm2 restart <actual-name>
```

**OR restart by ID:**

```bash
pm2 restart 0
# (use the ID number from pm2 list)
```

---

### **Step 2B: If list is empty - Start the bot fresh**

#### **Navigate to your bot folder:**

```bash
cd /root/ssbot
# OR wherever your bot is located
# Use: cd ~/ssbot  OR  cd /path/to/your/bot
```

#### **Install dependencies (REQUIRED after music removal):**

```bash
npm install
```

#### **Start the bot with PM2:**

```bash
pm2 start src/index.js --name ssbot
```

#### **Save the PM2 configuration:**

```bash
pm2 save
pm2 startup
```

---

## 🔍 Common Scenarios:

### **Scenario 1: Process has different name**

```bash
# Check current processes
pm2 list

# You might see something like:
# │ id │ name       │ status │
# │ 0  │ index      │ online │
# │ 1  │ discord    │ online │

# Restart using that name:
pm2 restart index
# OR
pm2 restart discord
```

### **Scenario 2: No processes running**

```bash
# Start fresh
cd /root/ssbot
npm install
pm2 start src/index.js --name ssbot
pm2 save
```

### **Scenario 3: Want to completely reset**

```bash
# Stop all PM2 processes
pm2 delete all

# Navigate to bot folder
cd /root/ssbot

# Install dependencies
npm install

# Start fresh
pm2 start src/index.js --name ssbot

# Save configuration
pm2 save
```

---

## 📋 Full Fresh Start (If Nothing Works):

```bash
# 1. Stop everything
pm2 delete all

# 2. Go to bot directory
cd /root/ssbot

# 3. Clean install
rm -rf node_modules package-lock.json
npm install

# 4. Start the bot
pm2 start src/index.js --name ssbot

# 5. Save PM2 config
pm2 save

# 6. Enable auto-restart on server reboot
pm2 startup

# 7. Check logs
pm2 logs ssbot
```

---

## 🎯 Quick Commands Reference:

```bash
# List all PM2 processes
pm2 list

# Start the bot
pm2 start src/index.js --name ssbot

# Restart by name
pm2 restart ssbot

# Restart by ID
pm2 restart 0

# Stop the bot
pm2 stop ssbot

# Delete from PM2
pm2 delete ssbot

# View logs
pm2 logs ssbot

# View logs (last 100 lines)
pm2 logs ssbot --lines 100

# Monitor in real-time
pm2 monit

# Save current PM2 list
pm2 save

# Clear all PM2 logs
pm2 flush
```

---

## ⚠️ Important Notes:

1. **After music removal, you MUST run `npm install`** to clean up dependencies
2. **The bot name in PM2 can be anything** - check with `pm2 list`
3. **Always run commands from your bot directory** (where package.json is)
4. **Use `pm2 logs ssbot`** to check for errors after restart

---

## 🔧 Troubleshooting:

### **Bot won't start:**

```bash
# Check Node version
node --version
# Should be v17 or higher

# Check if port is already in use
ps aux | grep node
# Kill any old processes if needed
```

### **Permission errors:**

```bash
# Fix ownership
sudo chown -R $USER:$USER /root/ssbot

# Or run with sudo
sudo npm install
```

### **MongoDB connection errors:**

Check your .env file has the correct MONGO_TOKEN

---

## ✅ Expected Output After Successful Start:

```bash
pm2 list
```

Should show something like:

```
┌────┬────────────┬─────────────┬─────────┬─────────┬──────────┐
│ id │ name       │ mode        │ status  │ restart │ uptime   │
├────┼────────────┼─────────────┼─────────┼─────────┼──────────┤
│ 0  │ ssbot      │ fork        │ online  │ 0       │ 2s       │
└────┴────────────┴─────────────┴─────────┴─────────┴──────────┘
```

---

**Let me know what you see when you run `pm2 list`!** 🚀
