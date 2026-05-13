import axios from "axios";
import http from "http";
import https from "https";
import { appendClaudeAnswer, appendInboxNote } from "../../lib/storage";

const httpAgent = new http.Agent({ family: 4 });
const httpsAgent = new https.Agent({ family: 4 });

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

async function sendTelegramMessage(chatId, text) {
  if (!TELEGRAM_TOKEN) {
    return;
  }

  await axios.post(
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
    {
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    },
    { httpAgent, httpsAgent, timeout: 10000 }
  );
}

async function handleNote(chatId, text) {
  const noteText = text.replace(/^\/note\s+/i, "").trim();
  if (!noteText) {
    return sendTelegramMessage(chatId, "Usage: /note <your note>");
  }

  await appendInboxNote(noteText);
  await sendTelegramMessage(chatId, "✅ Note added to Inbox.md");
}

async function handleAsk(chatId, text) {
  const query = text.replace(/^\/ask\s+/i, "").trim();
  if (!query) {
    return sendTelegramMessage(chatId, "Usage: /ask <question>");
  }

  if (!OPENROUTER_KEY) {
    return sendTelegramMessage(chatId, "❗ OpenRouter API key not configured");
  }

  try {
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
          Authorization: `Bearer ${OPENROUTER_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
        httpAgent,
        httpsAgent,
      }
    );

    const answer = response.data?.choices?.[0]?.message?.content || "(no response)";
    await appendClaudeAnswer(query, answer);

    const preview = answer.length > 1000 ? `${answer.substring(0, 1000)}...` : answer;
    await sendTelegramMessage(chatId, `💡 Answer saved to Claude Answers.md\n\n${preview}`);
  } catch (error) {
    console.error("AI request failed:", error.message);
    await sendTelegramMessage(chatId, "❗ Error contacting AI API");
  }
}

async function handleStart(chatId) {
  await sendTelegramMessage(
    chatId,
    "🤖 *DanGene Bot is active!*\n\n" +
      "Commands:\n" +
      "/note <text> - Save a note to Inbox.md\n" +
      "/ask <question> - Ask AI and save to Claude Answers.md"
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ status: "🤖 Telegram bot webhook is running!" });
  }

  try {
    const update = req.body;
    if (!update.message || !update.message.text) {
      return res.status(200).json({ ok: true });
    }

    const chatId = update.message.chat.id;
    const text = update.message.text;

    if (text.startsWith("/start")) {
      await handleStart(chatId);
    } else if (text.startsWith("/note")) {
      await handleNote(chatId, text);
    } else if (text.startsWith("/ask")) {
      await handleAsk(chatId, text);
    } else {
      await sendTelegramMessage(chatId, "Unknown command. Try /start to see available commands.");
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Error handling update:", error);
    return res.status(500).json({ error: "Failed to process update" });
  }
}
