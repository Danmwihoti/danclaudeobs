import fs from "fs/promises";
import path from "path";

export default async function handler(req, res) {
  // Check secret
  if (req.headers["x-secret"] !== process.env.DASHBOARD_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const vaultPath = process.env.VAULT_PATH || "/home/danhomelab/Documents/danGene";
  const aiHistoryPath = path.join(vaultPath, "AI Conversations.md");

  try {
    const content = await fs.readFile(aiHistoryPath, "utf-8");
    res.status(200).json({ content });
  } catch (e) {
    if (e.code === "ENOENT") {
      // File doesn't exist yet
      return res.status(200).json({ content: "", entries: [] });
    }
    console.error("Error reading AI history:", e.message);
    res.status(500).json({ error: e.message });
  }
}
