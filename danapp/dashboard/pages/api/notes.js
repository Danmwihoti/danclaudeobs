import { promises as fs } from "fs";
import path from "path";

const VAULT = process.env.VAULT_PATH || "/home/danhomelab/Documents/danGene";
const TRACKER_FILE = path.join(VAULT, "Templates", "Daily Tracker.md");

export default async function handler(req, res) {
  // simple secret guard
  if (req.headers["x-secret"] !== process.env.DASHBOARD_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }

  if (req.method === "GET") {
    try {
      const content = await fs.readFile(TRACKER_FILE, "utf-8");
      res.status(200).json({ content });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  } else if (req.method === "POST") {
    const { content } = req.body;
    if (typeof content !== "string") {
      return res.status(400).json({ error: "content must be a string" });
    }
    try {
      await fs.writeFile(TRACKER_FILE, content);
      res.status(200).json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
