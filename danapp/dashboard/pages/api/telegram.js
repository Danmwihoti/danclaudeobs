const { Telegraf } = require("telegraf");
const { promises: fs } = require("fs");
const path = require("path");
require("dotenv").config();

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const VAULT = process.env.VAULT_PATH || "/home/danhomelab/Documents/danGene";

// Helper to write a line to a markdown file
async function appendLine(file, line) {
  const fullPath = path.join(VAULT, file);
  await fs.appendFile(fullPath, `${line}\n`);
}

// Commands
bot.command("note", async (ctx) => {
  const text = ctx.message.text.replace(/^\/note\s+/, "").trim();
  if (!text) return ctx.reply("Usage: /note <your note>");
  await appendLine("Inbox.md", `- ${new Date().toISOString()} ${text}`);
  await ctx.reply("✅ Note added to Inbox.md");
});

bot.command("ask", async (ctx) => {
  const query = ctx.message.text.replace(/^\/ask\s+/, "").trim();
  if (!query) return ctx.reply("Usage: /ask <question>");
  
  try {
    const axios = require("axios");
    const http = require("http");
    const https = require("https");
    
    const httpAgent = new http.Agent({ family: 4 });
    const httpsAgent = new https.Agent({ family: 4 });
    
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "mistralai/mistral-small-3.1-24b-instruct:free",
        messages: [{ role: "user", content: query }],
        temperature: 0.2,
        max_tokens: 1024,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
        httpAgent,
        httpsAgent,
      }
    );
    
    const answer = response.data?.choices?.[0]?.message?.content || "(no response)";
    const notePath = "Claude Answers.md";
    await appendLine(notePath, `### ${query}`);
    await appendLine(notePath, answer);
    await ctx.reply(`💡 Answer saved to ${notePath}`);
  } catch (e) {
    console.error(e);
    await ctx.reply("❗ Error contacting AI API");
  }
});

bot.command("start", async (ctx) => {
  await ctx.reply("🤖 DanGene Bot is active!\n\nCommands:\n/note <text> - Save a note to Inbox.md\n/ask <question> - Ask AI and save to Claude Answers.md");
});

// Webhook handler for Vercel
module.exports = async function handler(req, res) {
  if (req.method === "POST") {
    try {
      await bot.handleUpdate(req.body, res);
    } catch (e) {
      console.error("Error handling update:", e);
      res.status(500).json({ error: "Failed to process update" });
    }
  } else if (req.method === "GET") {
    res.status(200).json({ status: "🤖 Telegram bot webhook is running!" });
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
};
