import { Telegraf } from "telegraf";
import { promises as fs } from "fs";
import path from "path";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const VAULT = process.env.VAULT_PATH || "/home/danhomelab/Documents/danGene";

// Helper to write a line to a markdown file
async function appendLine(file, line) {
  const fullPath = path.join(VAULT, file);
  await fs.appendFile(fullPath, `${line}\n`);
}

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
    const answer = await callClaude(query);
    const notePath = "Claude Answers.md";
    await appendLine(notePath, `### ${query}`);
    await appendLine(notePath, answer);
    await ctx.reply(`💡 Answer saved to ${notePath}`);
  } catch (e) {
    console.error(e);
    await ctx.reply("❗ Error contacting Claude API");
  }
});

async function callClaude(prompt) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-opus-20240229",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await resp.json();
  return data.content?.[0]?.text ?? "(no response)";
}

bot.launch();
console.log("🤖 Telegram bot is running");
