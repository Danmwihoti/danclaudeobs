import { Telegraf } from "telegraf";
import dotenv from "dotenv";
import fetch from "node-fetch";
import {
  appendClaudeAnswer,
  appendInboxNote,
} from "../../dashboard/lib/storage.js";

dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

bot.command("note", async (ctx) => {
  const text = ctx.message.text.replace(/^\/note\s+/, "").trim();
  if (!text) {
    return ctx.reply("Usage: /note <your note>");
  }

  await appendInboxNote(text);
  await ctx.reply("✅ Note added to Inbox.md");
});

bot.command("ask", async (ctx) => {
  const query = ctx.message.text.replace(/^\/ask\s+/, "").trim();
  if (!query) {
    return ctx.reply("Usage: /ask <question>");
  }

  try {
    const answer = await callClaude(query);
    await appendClaudeAnswer(query, answer);
    await ctx.reply("💡 Answer saved to Claude Answers.md");
  } catch (error) {
    console.error(error);
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
