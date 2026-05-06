import fetch from "node-fetch";

export default async function handler(req, res) {
  // protect with secret header
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
  if (!apiKey) return res.status(500).json({ error: "OpenRouter API key missing" });

  // default model – you can change to any OpenRouter model identifier
  const selectedModel = model || "openrouter/anthropic/claude-3-opus";

  const payload = {
    model: selectedModel,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    max_tokens: 1024,
  };

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    const answer = data?.choices?.[0]?.message?.content || "";
    res.status(200).json({ answer });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}
