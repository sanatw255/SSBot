const express = require("express");
const { exec } = require("child_process");
const crypto = require("crypto");
require("dotenv").config();

const app = express();
const PORT = 3000;

// Load secret from .env
const SECRET = process.env.WEBHOOK_SECRET;

// Raw body parser for signature verification
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Verify GitHub signature (more secure)
function verifySignature(req) {
  const signature = req.headers["x-hub-signature-256"];
  if (!signature) return false;

  const hmac = crypto.createHmac("sha256", SECRET);
  const digest = `sha256=${hmac.update(req.rawBody).digest("hex")}`;

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  } catch {
    return false;
  }
}

app.post("/payload", (req, res) => {
  if (!verifySignature(req)) {
    console.log("❌ Invalid signature — unauthorized webhook attempt.");
    return res.sendStatus(401);
  }

  console.log("✅ Valid webhook received!");

  exec(
    "cd ~/ssbot && git pull origin main && npm install && pm2 restart ssbot",
    (err, stdout, stderr) => {
      if (err) return console.error(`Error: ${err}`);
      console.log(stdout || stderr);
    }
  );

  res.sendStatus(200);
});

app.listen(PORT, () => console.log(`🚀 Webhook listening on port ${PORT}`));
