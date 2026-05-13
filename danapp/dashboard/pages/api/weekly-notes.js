import { getDocument, setDocument } from "../../lib/storage";

export default async function handler(req, res) {
  if (req.headers["x-secret"] !== process.env.DASHBOARD_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method === "GET") {
    try {
      const content = await getDocument("weekly_tracker");
      return res.status(200).json({ content });
    } catch (error) {
      console.error("Failed to read weekly tracker:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === "POST") {
    const { content } = req.body;
    if (typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ error: "No content provided" });
    }

    try {
      await setDocument("weekly_tracker", content);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Failed to save weekly tracker:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
