const express = require("express");
const { exec } = require("child_process");

const app = express();
const PORT = 3000;
const SECRET = "discordssbot69";

app.use(express.json());

app.post("/payload", (req, res) => {
  console.log("Webhook received!");
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
