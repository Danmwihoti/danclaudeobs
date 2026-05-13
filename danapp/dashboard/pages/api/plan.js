import axios from "axios";
import http from "http";
import https from "https";
import { appendAiHistoryEntry, getTrackerContext } from "../../lib/storage";

const httpAgent = new http.Agent({ family: 4 });
const httpsAgent = new https.Agent({ family: 4 });

const FREE_MODELS = [
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "qwen/qwen3-coder:free",
  "nvidia/nemotron-nano-12b-v2-vl:free",
];

export default async function handler(req, res) {
  if (req.headers["x-secret"] !== process.env.DASHBOARD_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { prompt, model } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "prompt required" });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OpenRouter API key missing" });
  }

  let trackerContext = "";
  try {
    const { daily, weekly } = await getTrackerContext();
    trackerContext = `DAILY TRACKER:\n${daily}\n\nWEEKLY TRACKER:\n${weekly}`;
  } catch (error) {
    console.log("Could not load tracker context from database:", error.message);
  }

  const isAnalysisRequest =
    prompt.toLowerCase().includes("analy") ||
    prompt.toLowerCase().includes("tip") ||
    prompt.toLowerCase().includes("improve") ||
    prompt.toLowerCase().includes("guidance") ||
    prompt.toLowerCase().includes("help me");

  const systemMessage = isAnalysisRequest
    ? `You are a productivity coach analyzing the user's Daily and Weekly Trackers.
Provide SPECIFIC, ACTIONABLE tips and guidance based on their actual tracker content.
Focus on:
- Goal progress and completion rates
- Patterns in blockers or reflections
- Specific improvements for next week
- Accountability insights
Format your response with clear sections and bullet points.`
    : "You are a helpful AI assistant.";

  const fullPrompt = trackerContext
    ? `${systemMessage}\n\nTRACKER DATA:\n${trackerContext}\n\nUser Question: ${prompt}`
    : prompt;

  const modelsToTry = model ? [model] : FREE_MODELS;
  let lastError = null;

  for (const selectedModel of modelsToTry) {
    const payload = {
      model: selectedModel,
      messages: isAnalysisRequest
        ? [
            { role: "system", content: systemMessage },
            {
              role: "user",
              content: `TRACKER DATA:\n${trackerContext}\n\nUser Question: ${prompt}`,
            },
          ]
        : [{ role: "user", content: fullPrompt }],
      temperature: 0.2,
      max_tokens: 2048,
    };

    try {
      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        payload,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
          httpAgent,
          httpsAgent,
        }
      );

      const answer = response.data?.choices?.[0]?.message?.content || "";
      await appendAiHistoryEntry(prompt, answer, selectedModel);

      return res.status(200).json({ answer, model: selectedModel });
    } catch (error) {
      console.error(`Model ${selectedModel} failed:`, error.response?.data || error.message);
      lastError = error;
      if (model) {
        break;
      }
    }
  }

  console.error("All models failed:", lastError?.response?.data || lastError?.message);
  if (lastError?.response) {
    return res.status(lastError.response.status).json({
      error: lastError.response.data?.error?.message || "All free models failed",
      details: lastError.response.data,
    });
  }

  return res.status(500).json({ error: `Network error: ${lastError?.message}` });
}
