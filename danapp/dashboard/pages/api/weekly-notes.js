const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;
const VAULT_PATH = process.env.VAULT_PATH;

export default async function handler(req, res) {
  const secret = req.headers['x-secret'];
  if (secret !== process.env.DASHBOARD_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      let content = '';
      // 1. Try local vault first (if exists)
      if (VAULT_PATH) {
        const localPath = path.join(VAULT_PATH, 'Templates/Weekly Tracker.md');
        if (fs.existsSync(localPath)) {
          content = fs.readFileSync(localPath, 'utf8');
        }
      }
      // 2. If no local file, try Neon (latest weekly entry)
      if (!content && pool) {
        const { rows } = await pool.query(
          'SELECT content FROM weekly_tracker ORDER BY week_start_date DESC LIMIT 1'
        );
        if (rows.length > 0) content = rows[0].content;
      }
      // 3. Fallback to empty template
      if (!content) content = getWeeklyTemplate();
      res.json({ content });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to read weekly tracker' });
    }
  } else if (req.method === 'POST') {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'No content provided' });

    try {
      // 1. Write to local vault (if VAULT_PATH exists)
      if (VAULT_PATH) {
        const localPath = path.join(VAULT_PATH, 'Templates/Weekly Tracker.md');
        fs.writeFileSync(localPath, content, 'utf8');
      }
      // 2. Write to Neon (extract week start date from header)
      if (pool) {
        const dateMatch = content.match(/# Weekly Tracker - (\d{4}-\d{2}-\d{2})/);
        const weekStart = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];
        await pool.query(
          'INSERT INTO weekly_tracker (week_start_date, content) VALUES ($1, $2)',
          [weekStart, content]
        );
      }
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to save weekly tracker' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

function getWeeklyTemplate() {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
  const yyyy = monday.getFullYear();
  const mm = String(monday.getMonth() + 1).padStart(2, '0');
  const dd = String(monday.getDate()).padStart(2, '0');
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
- `;
}
