import { promises as fs } from "fs";
import path from "path";

// Resolve the vault directory. Prefer the explicit VAULT_PATH env var; if missing fall back to repo root.
let VAULT = process.env.VAULT_PATH ? path.resolve(process.env.VAULT_PATH) : null;
if (!VAULT) {
  // __dirname points to <repo>/danapp/dashboard/pages/api
  VAULT = path.resolve(__dirname, '../../../');
}

// Resolve the tracker file location inside the repo.
// In Vercel the repo root is the current working directory.
const TRACKER_FILE = path.resolve(process.cwd(), 'danapp', 'dashboard', 'Templates', 'Daily Tracker.md');

// Debug: log resolved paths for troubleshooting
console.log('VAULT resolved to:', VAULT);
console.log('TRACKER_FILE resolved to:', TRACKER_FILE);

// Verify the file exists before trying to read/write
async function ensurePathExists(p) {
  try {
    await fs.access(p);
  } catch (_) {
    console.error('File not found at', p);
    throw new Error('Tracker file not found');
  }
}

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
