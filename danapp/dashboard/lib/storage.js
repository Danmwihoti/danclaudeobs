import { promises as fs } from "fs";
import path from "path";
import { Pool } from "pg";

const globalPool = globalThis.__danGeneStoragePool;

export const pool =
  globalPool ||
  (process.env.DATABASE_URL
    ? new Pool({ connectionString: process.env.DATABASE_URL })
    : null);

if (!globalPool && pool) {
  globalThis.__danGeneStoragePool = pool;
}

const VAULT_PATH = process.env.VAULT_PATH
  ? path.resolve(process.env.VAULT_PATH)
  : null;
const LOCAL_REPO_VAULT_PATH = path.resolve(process.cwd(), "..");

const DOCUMENTS = {
  daily_tracker: {
    filePath: ["Templates", "Daily Tracker.md"],
    defaultContent: getDailyTemplate,
  },
  weekly_tracker: {
    filePath: ["Templates", "Weekly Tracker.md"],
    defaultContent: getWeeklyTemplate,
  },
  ai_history: {
    filePath: ["AI Conversations.md"],
    defaultContent: () => "",
  },
  inbox_notes: {
    filePath: ["Inbox.md"],
    defaultContent: () => "",
  },
  claude_answers: {
    filePath: ["Claude Answers.md"],
    defaultContent: () => "",
  },
};

export async function ensureStorageSchema() {
  if (!pool) {
    throw new Error("DATABASE_URL is not configured");
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_documents (
      key TEXT PRIMARY KEY,
      content TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function getDocument(key) {
  const documentConfig = DOCUMENTS[key];
  if (!documentConfig) {
    throw new Error(`Unknown document key: ${key}`);
  }

  await ensureStorageSchema();

  const { rows } = await pool.query(
    "SELECT content FROM app_documents WHERE key = $1",
    [key]
  );
  if (rows.length > 0) {
    return rows[0].content;
  }

  const bootstrapped = await loadFromVaultIfPresent(documentConfig);
  const content =
    bootstrapped ?? resolveDefaultContent(documentConfig.defaultContent);

  await pool.query(
    `
      INSERT INTO app_documents (key, content, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (key)
      DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()
    `,
    [key, content]
  );

  return content;
}

export async function setDocument(key, content) {
  const documentConfig = DOCUMENTS[key];
  if (!documentConfig) {
    throw new Error(`Unknown document key: ${key}`);
  }

  await ensureStorageSchema();
  await pool.query(
    `
      INSERT INTO app_documents (key, content, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (key)
      DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()
    `,
    [key, content]
  );

  await syncDocumentToVault(key, content);
}

export async function appendDocument(key, addition) {
  const currentContent = await getDocument(key);
  const nextContent = currentContent
    ? `${currentContent}${addition}`
    : addition.replace(/^\n+/, "");

  await setDocument(key, nextContent);
  return nextContent;
}

export async function getTrackerContext() {
  const [daily, weekly] = await Promise.all([
    getDocument("daily_tracker"),
    getDocument("weekly_tracker"),
  ]);

  return { daily, weekly };
}

export async function appendAiHistoryEntry(prompt, response, model) {
  const timestamp = new Date().toLocaleString();
  const entry = `\n\n---\n### AI Interaction: ${timestamp}\n**Model:** ${model}\n**Prompt:**\n${prompt}\n**Response:**\n${response}\n---\n`;
  return appendDocument("ai_history", entry);
}

export async function appendInboxNote(noteText) {
  const entry = `- ${new Date().toISOString()} ${noteText}\n`;
  return appendDocument("inbox_notes", entry);
}

export async function appendClaudeAnswer(query, answer) {
  const entry = `### ${query}\n${answer}\n`;
  return appendDocument("claude_answers", entry);
}

export async function importVaultDocuments({ overwrite = true } = {}) {
  await ensureStorageSchema();

  const results = [];
  for (const [key, documentConfig] of Object.entries(DOCUMENTS)) {
    const absolutePath = await findExistingVaultFilePath(documentConfig);
    if (!absolutePath) {
      results.push({ key, imported: false, reason: "missing" });
      continue;
    }

    const content = await fs.readFile(absolutePath, "utf-8");
    if (!overwrite) {
      const { rows } = await pool.query(
        "SELECT 1 FROM app_documents WHERE key = $1 LIMIT 1",
        [key]
      );
      if (rows.length > 0) {
        results.push({ key, imported: false, reason: "exists" });
        continue;
      }
    }

    await pool.query(
      `
        INSERT INTO app_documents (key, content, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (key)
        DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()
      `,
      [key, content]
    );
    results.push({ key, imported: true, path: absolutePath, size: content.length });
  }

  return results;
}

async function loadFromVaultIfPresent(documentConfig) {
  const absolutePath = await findExistingVaultFilePath(documentConfig);
  if (!absolutePath) {
    return null;
  }

  try {
    return await fs.readFile(absolutePath, "utf-8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    console.error("Failed to bootstrap document from vault:", error);
    return null;
  }
}

async function syncDocumentToVault(key, content) {
  const documentConfig = DOCUMENTS[key];
  const absolutePath = getVaultFilePath(documentConfig);
  if (!absolutePath) {
    return;
  }

  try {
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, content, "utf-8");
  } catch (error) {
    console.error(`Failed to sync ${key} to vault:`, error);
  }
}

function getVaultFilePath(documentConfig) {
  if (!VAULT_PATH || !documentConfig?.filePath) {
    return null;
  }

  return path.join(VAULT_PATH, ...documentConfig.filePath);
}

async function findExistingVaultFilePath(documentConfig) {
  if (!documentConfig?.filePath) {
    return null;
  }

  const candidates = [
    getVaultFilePath(documentConfig),
    path.join(LOCAL_REPO_VAULT_PATH, ...documentConfig.filePath),
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch (_) {
      continue;
    }
  }

  return null;
}

function resolveDefaultContent(defaultContent) {
  return typeof defaultContent === "function" ? defaultContent() : defaultContent;
}

function getDailyTemplate() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const dateStr = `${yyyy}-${mm}-${dd}`;

  return `# ${dateStr} - Daily Tracker

## 🎯 Goals for the Day
- [ ] **Career**:
- [ ] **Wealth**:
- [ ] **Fun**:

## 📚 Reading
- **Personal growth**:
- **Bitcoin**:
- **Rust**:
- **Quant**:

## 💻 Coding / Open-Source
- Repository:
- Feature / Bug:
- PR # (if any):

## 💼 Job Hunt / Gigs
- Applications sent:
- Follow-ups needed:

## 🏆 Hackathons / Events
- Event name:
- Key takeaways:

## 🤝 Networking
- People contacted:
- Follow-up actions:

## 🗣️ Communication Practice
- Activity (e.g., talk, write, podcast):

## ✅ End-of-Day Review
- What I accomplished:
- What I'll improve tomorrow:
`;
}

function getWeeklyTemplate() {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
  const yyyy = monday.getFullYear();
  const mm = String(monday.getMonth() + 1).padStart(2, "0");
  const dd = String(monday.getDate()).padStart(2, "0");
  const weekStart = `${yyyy}-${mm}-${dd}`;

  return `# Weekly Tracker - ${weekStart}

## 🎯 Goals This Week
- [ ] Goal1:
- [ ] Goal2:
- [ ] Goal3:

## ✅ Completed Tasks
- 

## 🚧 Blockers
- 

## 📝 Reflections
- 

## 📊 Accountability Check
**Did I meet my goals?**
- 

**What slowed me down?**
- 

**What will I improve next week?**
- 
`;
}
