import { getDocument, setDocument } from "../../lib/storage";

export default async function handler(req, res) {
  if (req.headers["x-secret"] !== process.env.DASHBOARD_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }

  if (req.method === "GET") {
    try {
      const content = await getDocument("daily_tracker");
      return res.status(200).json({ content });
    } catch (error) {
      console.error("Failed to load daily tracker:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === "POST") {
    const { content } = req.body;
    if (typeof content !== "string") {
      return res.status(400).json({ error: "content must be a string" });
    }

    try {
      await setDocument("daily_tracker", content);
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error("Failed to save daily tracker:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
