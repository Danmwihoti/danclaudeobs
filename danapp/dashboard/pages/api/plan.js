import axios from "axios";
import http from "http";
import https from "https";

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
  if (!prompt) return res.status(400).json({ error: "prompt required" });

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OpenRouter API key missing" });
  }

  // Read tracker context (Daily + Weekly)
  let trackerContext = "";
  try {
    const fs = require("fs").promises;
    const path = require("path");
    const vaultPath = process.env.VAULT_PATH || "/home/danhomelab/Documents/danGene";
    
    // Read Daily Tracker
    const dailyPath = path.join(vaultPath, "Templates", "Daily Tracker.md");
    const dailyContent = await fs.readFile(dailyPath, "utf-8");
    
    // Read Weekly Tracker
    const weeklyPath = path.join(vaultPath, "Templates", "Weekly Tracker.md");
    const weeklyContent = await fs.readFile(weeklyPath, "utf-8");
    
    trackerContext = `DAILY TRACKER:\n${dailyContent}\n\nWEEKLY TRACKER:\n${weeklyContent}`;
  } catch (e) {
    console.log("Could not load trackers:", e.message);
  }

  // Check if this is an analysis request
  const isAnalysisRequest = prompt.toLowerCase().includes("analy") || 
                           prompt.toLowerCase().includes("tip") || 
                           prompt.toLowerCase().includes("improve") ||
                           prompt.toLowerCase().includes("guidance") ||
                           prompt.toLowerCase().includes("help me");

  const systemMessage = isAnalysisRequest ? 
    `You are a productivity coach analyzing the user's Daily and Weekly Trackers. 
     Provide SPECIFIC, ACTIONABLE tips and guidance based on their actual tracker content.
     Focus on:
     - Goal progress and completion rates
     - Patterns in blockers or reflections
     - Specific improvements for next week
     - Accountability insights
     Format your response with clear sections and bullet points.` : 
    "You are a helpful AI assistant.";

  const fullPrompt = trackerContext 
    ? `${systemMessage}\n\nTRACKER DATA:\n${trackerContext}\n\nUser Question: ${prompt}`
    : prompt;

  const modelsToTry = model ? [model] : FREE_MODELS;
  let lastError = null;

  for (const selectedModel of modelsToTry) {
    const payload = {
      model: selectedModel,
      messages: isAnalysisRequest ? [
        { role: "system", content: systemMessage },
        { role: "user", content: `TRACKER DATA:\n${trackerContext}\n\nUser Question: ${prompt}` }
      ] : [
        { role: "user", content: fullPrompt }
      ],
      temperature: 0.2,
      max_tokens: 2048,
    };

    try {
      console.log("Trying model:", selectedModel);
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
      
      // Save AI interaction to Obsidian
      await saveAIInteractionToObsidian(prompt, answer, selectedModel);
      
      return res.status(200).json({ answer, model: selectedModel });
    } catch (e) {
      console.error(`Model ${selectedModel} failed:`, e.response?.data || e.message);
      lastError = e;
      if (model) break;
      continue;
    }
  }

  console.error("All models failed:", lastError?.response?.data || lastError?.message);
  if (lastError?.response) {
    return res.status(lastError.response.status).json({
      error: lastError.response.data?.error?.message || "All free models failed",
      details: lastError.response.data
    });
  }
  res.status(500).json({ error: `Network error: ${lastError?.message}` });
}

async function saveAIInteractionToObsidian(prompt, response, model) {
  try {
    const fs = require("fs").promises;
    const path = require("path");
    const vaultPath = process.env.VAULT_PATH || "/home/danhomelab/Documents/danGene";
    const aiHistoryPath = path.join(vaultPath, "AI Conversations.md");
    
    const timestamp = new Date().toLocaleString();
    const entry = `\n\n---\n### AI Interaction: ${timestamp}\n**Model:** ${model}\n**Prompt:**\n${prompt}\n**Response:**\n${response}\n---\n`;
    
    // Append to file (create if doesn't exist)
    await fs.appendFile(aiHistoryPath, entry, "utf-8");
    console.log("Saved AI interaction to Obsidian");
  } catch (e) {
    console.error("Failed to save AI interaction:", e.message);
  }
}
