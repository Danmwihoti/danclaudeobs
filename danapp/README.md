# Personal Activity Tracker & Telegram Bot

## Overview
This repository contains two loosely‑coupled pieces that work together to let you **track daily activities** stored in an Obsidian vault and interact with those notes via a Telegram bot.

```
/home/danhomelab/Documents/danGene/
├─ danapp/
│  ├─ telegram-bot/        # Minimal Telegraf bot
│  │   ├─ src/index.js
│  │   └─ package.json
│  ├─ dashboard/           # Next.js front‑end + API for the vault
│  │   ├─ pages/
│  │   │   ├─ index.tsx      # Daily‑tracker UI
│  │   │   ├─ vault.tsx      # Simple file‑browser UI
│  │   │   └─ api/
│  │   │       ├─ notes.js   # read/write Daily Tracker
│  │   │       ├─ plan.js    # call OpenRouter model for planning
│  │   │       └─ vault/
│  │   │           ├─ list.js   # list files/dirs in vault
│  │   │           └─ read.js   # read arbitrary file content
│  │   ├─ .env.example
│  │   └─ package.json
│  └─ README.md            # <‑ **you are reading this**
```

* The **Telegram bot** can add quick notes (`/note`) and ask Claude (via OpenRouter) for answers (`/ask`).
* The **Next.js dashboard** provides a web UI to edit the *Daily Tracker* markdown file, browse any file in the vault, and request planning assistance from an OpenRouter model.

## Prerequisites
- **Node.js** (v18 or later) and **npm** installed.
- Access to the Obsidian vault directory (`VAULT_PATH`). In this repo it is `/home/danhomelab/Documents/danGene`.
- A Telegram bot token (create a bot with @BotFather).
- An OpenRouter API key (sign‑up at https://openrouter.ai).  
- (Optional) Anthropic API key if you still want to call Anthropic directly from the bot.

## Setup
### 1. Clone the repo (or copy the folder structure)
```bash
git clone <your-repo-url>   # or just work inside the existing folder
cd /home/danhomelab/Documents/danGene/danapp
```
### 2. Install dependencies for each sub‑project
```bash
# Telegram bot
cd telegram-bot
npm install

# Dashboard (Next.js)
cd ../dashboard
npm install
```
### 3. Create environment files
Copy the example files and fill in your secrets:
```bash
# Telegram bot
cp .env.example .env   # inside telegram-bot folder, then edit

# Dashboard
cp .env.example .env   # inside dashboard folder, then edit
```
**Required variables**:
| Variable | Where it is used | Example |
|----------|------------------|---------|
| `TELEGRAM_TOKEN` | Bot (`telegram-bot/src/index.js`) | `123456:ABCdefGHIjklMNOpqrSTUvwXYZ` |
| `ANTHROPIC_API_KEY` | Bot (optional, for direct Anthropic calls) | `sk-ant‑...` |
| `VAULT_PATH` | Both bot and dashboard – absolute path to your Obsidian vault | `/home/danhomelab/Documents/danGene` |
| `DASHBOARD_SECRET` | Protects all dashboard API routes (`/api/*`) | `my‑super‑secret` |
| `NEXT_PUBLIC_DASHBOARD_SECRET` | Same secret, exposed to client code | `my‑super‑secret` |
| `OPENROUTER_API_KEY` | Dashboard `/api/plan` endpoint | `or‑sk‑...` |

### 4. Run locally
#### Telegram bot
```bash
cd telegram-bot
npm run dev   # starts the bot, listens for messages
```
You should see `🤖 Telegram bot is running` in the console.  Interact with it on Telegram using `/note` or `/ask`.

#### Dashboard (Next.js)
```bash
cd ../dashboard
npm run dev   # starts http://localhost:3000
```
Open the URL in a browser:
- `/` – Daily Tracker editor.
- `/vault` – Simple file browser that can list and view any markdown file in the vault.
- Use the **Generate plan** button (you can add it later) to call OpenRouter via `/api/plan`.

### 5. Build for production
```bash
npm run build   # creates .next production build
npm start       # runs the production server (same env vars required)
```
### 6. Deploy to Vercel (or any Node host)
1. Push the `dashboard` folder to a Git repository.
2. In Vercel, **Import Project** → select the repo → Vercel will detect the `package.json` and run `npm install && npm run build`.
3. In **Project Settings → Environment Variables**, add the same variables from your `.env` (including `NEXT_PUBLIC_DASHBOARD_SECRET`).
4. Deploy – Vercel will give you a URL like `https://my‑tracker.vercel.app`.

> **Important** – The dashboard reads/writes files inside the vault path. When deployed, make sure the vault files are part of the repo (or mounted via a compatible storage solution) so the server can access them.

## Usage Guide
### Telegram Bot Commands
- `/note <text>` – Appends a timestamped line to `Inbox.md` in the vault.
- `/ask <question>` – Sends the question to Claude (via OpenRouter) and stores the answer in `Claude Answers.md`.
- *(You can extend the bot with more commands – e.g., list tasks, toggle check‑boxes.)*

### Dashboard UI
- **Daily Tracker (`/`)** – Edit the markdown template you created in Obsidian. Click **Save** to persist changes back to the vault.
- **Vault Browser (`/vault`)** – Navigate folders, click a file to view its raw content.
- **Planning (`/api/plan`)** – POST `{ "prompt": "...", "model": "openrouter/anthropic/claude-3-opus" }` to get a concise plan from an OpenRouter‑hosted Claude model.

## Extending the Project
- **Edit endpoint** – Add `pages/api/vault/write.js` to allow the UI to modify any file (guard with secret).
- **Task management** – Store tasks in a dedicated markdown file and expose CRUD APIs.
- **Authentication** – Replace the simple secret header with JWT/OAuth for multi‑user setups.
- **Styling** – Plug in Tailwind CSS or any UI library for a polished look.

## Troubleshooting
- **`ENOENT` errors** – Ensure `VAULT_PATH` points to the correct absolute directory and that the `.env` file is loaded.
- **Missing OpenRouter key** – The `/api/plan` endpoint returns a 500 error if `OPENROUTER_API_KEY` is not set.
- **CORS** – All API calls are same‑origin in Next.js; if you call them from another domain, add appropriate headers in the API handlers.

---
*Generated on 2026‑05‑07 – keep this README up‑to‑date as you add new features.*
