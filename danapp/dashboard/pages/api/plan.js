import axios from "axios";
import http from "http";
import https from "https";

// Force IPv4 by creating agents with family: 4
const httpAgent = new http.Agent({ family: 4 });
const httpsAgent = new https.Agent({ family: 4 });

export default async function handler(req, res) {
  // protect with secret header
  if (req.headers["x-secret"] !== process.env.DASHBOARD_SECRET) {
    console.error("Auth failed: secret mismatch");
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
    console.error("OPENROUTER_API_KEY not set");
    return res.status(500).json({ error: "OpenRouter API key missing" });
  }

  // Use free model to save costs during testing
  const selectedModel = model || "meta-llama/llama-3.1-8b-instruct:free";

  const payload = {
    model: selectedModel,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    max_tokens: 1024,
  };

  try {
    console.log("Calling OpenRouter with model:", selectedModel);
    
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
    
    console.log("OpenRouter response status:", response.status);
    
    const answer = response.data?.choices?.[0]?.message?.content || "";
    res.status(200).json({ answer });

  } catch (e) {
    console.error("OpenRouter error:", e.response?.data || e.message);
    
    if (e.code === 'ETIMEDOUT' || e.code === 'ECONNABORTED') {
      return res.status(504).json({ error: "Request timeout - check your network connection" });
    }
    
    if (e.response) {
      return res.status(e.response.status).json({ 
        error: e.response.data?.error?.message || "OpenRouter API error",
        details: e.response.data 
      });
    }
    
    res.status(500).json({ error: `Network error: ${e.message}` });
  }
}
