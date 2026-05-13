import { getDocument } from "../../lib/storage";

export default async function handler(req, res) {
  if (req.headers["x-secret"] !== process.env.DASHBOARD_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const content = await getDocument("ai_history");
    return res.status(200).json({ content });
  } catch (error) {
    console.error("Error reading AI history:", error);
    return res.status(500).json({ error: error.message });
  }
}
