import { promises as fs } from "fs";
import path from "path";
import { Pool } from "pg";

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

const VAULT_PATH = process.env.VAULT_PATH
  ? path.resolve(process.env.VAULT_PATH)
  : path.resolve(process.cwd(), "..");
const TRACKER_FILE = path.join(VAULT_PATH, "Templates", "Daily Tracker.md");

function getEmptyTemplate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const dateStr = `${yyyy}-${mm}-${dd}`;

  return `# Daily Tracker - ${dateStr}

## 🌅 Morning Intention
- 

## ✅ What I Accomplished
- 

## 📚 What I Learned
- 

## 💡 Ideas & Notes
- 

## 🎯 Next Steps
- 
`;
}

async function localFileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch (_) {
    return false;
  }
}

async function ensureDailyTrackerTable() {
  if (!pool) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS daily_tracker (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      content TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function loadDailyTracker() {
  if (await localFileExists(TRACKER_FILE)) {
    const content = await fs.readFile(TRACKER_FILE, "utf-8");
    return { content, source: "file" };
  }

  if (pool) {
    await ensureDailyTrackerTable();
    const { rows } = await pool.query(
      "SELECT content FROM daily_tracker WHERE id = 1"
    );
    if (rows.length > 0) {
      return { content: rows[0].content, source: "database" };
    }
  }

  return { content: getEmptyTemplate(), source: "template" };
}

async function saveDailyTracker(content) {
  let saved = false;
  const errors = [];

  if (process.env.VAULT_PATH) {
    try {
      await fs.mkdir(path.dirname(TRACKER_FILE), { recursive: true });
      await fs.writeFile(TRACKER_FILE, content, "utf-8");
      saved = true;
    } catch (error) {
      errors.push(new Error(`Local file save failed: ${error.message}`));
    }
  }

  if (pool) {
    try {
      await ensureDailyTrackerTable();
      await pool.query(
        `
          INSERT INTO daily_tracker (id, content, updated_at)
          VALUES (1, $1, NOW())
          ON CONFLICT (id)
          DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()
        `,
        [content]
      );
      saved = true;
    } catch (error) {
      errors.push(new Error(`Database save failed: ${error.message}`));
    }
  }

  if (!saved) {
    throw new Error(
      errors[0]?.message ||
        "No persistence backend configured. Set VAULT_PATH or DATABASE_URL."
    );
  }
}

export default async function handler(req, res) {
  if (req.headers["x-secret"] !== process.env.DASHBOARD_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }

  if (req.method === "GET") {
    try {
      const { content, source } = await loadDailyTracker();
      console.log("Loaded daily tracker from:", source);
      res.status(200).json({ content });
    } catch (e) {
      console.error("Failed to load daily tracker:", e);
      res.status(500).json({ error: e.message });
    }
  } else if (req.method === "POST") {
    const { content } = req.body;
    if (typeof content !== "string") {
      return res.status(400).json({ error: "content must be a string" });
    }
    try {
      await saveDailyTracker(content);
      res.status(200).json({ ok: true });
    } catch (e) {
      console.error("Failed to save daily tracker:", e);
      res.status(500).json({ error: e.message });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
