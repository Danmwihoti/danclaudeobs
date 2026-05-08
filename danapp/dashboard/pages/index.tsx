import { useEffect, useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";

const secret = process.env.NEXT_PUBLIC_DASHBOARD_SECRET || "";

export default function TrackerPage() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"tracker" | "ai" | "weekly">("tracker");
  
  // AI planning state
  const [prompt, setPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  
  // Weekly tracker state
  const [weeklyContent, setWeeklyContent] = useState("");
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklySaving, setWeeklySaving] = useState(false);
  const [weeklyPreviewMode, setWeeklyPreviewMode] = useState(false);
  const [weeklyMsg, setWeeklyMsg] = useState("");

  useEffect(() => {
    loadTracker();
  }, []);

  const loadTracker = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/notes", {
        headers: { "x-secret": secret },
      });
      setContent(res.data.content);
    } catch (e) {
      console.error(e);
      setMsg("❗ Could not load tracker");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!content.trim()) {
      setMsg("❗ Nothing to save");
      return;
    }
    
    setSaving(true);
    setMsg("");
    try {
      await axios.post(
        "/api/notes",
        { content },
        { headers: { "x-secret": secret } }
      );
      setMsg("✅ Saved successfully");
      
      // Clear form after short delay and load fresh template
      setTimeout(() => {
        setMsg("");
        setContent(getEmptyTemplate());
        setPreviewMode(false);
      }, 1500);
    } catch (e) {
      console.error(e);
      setMsg("❗ Save failed");
    } finally {
      setSaving(false);
    }
  };

  const appendEntry = async () => {
    if (!content.trim()) {
      setMsg("❗ Nothing to save");
      return;
    }
    
    setSaving(true);
    setMsg("");
    try {
      // Get current content
      const res = await axios.get("/api/notes", {
        headers: { "x-secret": secret },
      });
      
      const currentContent = res.data.content;
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const timestamp = `${dateStr} ${today.getHours()}:${String(today.getMinutes()).padStart(2, '0')}`;
      const newEntry = `\n\n---\n### Entry: ${timestamp}\n\n${content}`;
      
      // Append new entry to existing content
      await axios.post(
        "/api/notes",
        { content: currentContent + newEntry },
        { headers: { "x-secret": secret } }
      );
      
      setMsg("✅ Entry added successfully");
      
      // Clear form for next entry
      setTimeout(() => {
        setMsg("");
        setContent("");
        setPreviewMode(false);
      }, 1500);
    } catch (e) {
      console.error(e);
      setMsg("❗ Failed to add entry");
    } finally {
      setSaving(false);
    }
  };

  const getEmptyTemplate = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
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
  };

  const askAI = async () => {
    if (!prompt.trim()) return;
    setAiLoading(true);
    setAiResponse("");
    try {
      const res = await axios.post(
        "/api/plan",
        { prompt },
        { headers: { "x-secret": secret } }
      );
      setAiResponse(res.data.answer);
    } catch (e) {
      console.error(e);
      setAiResponse("❗ Error: Could not get AI response");
    } finally {
      setAiLoading(false);
    }
  };

  // Weekly Tracker Functions
  const loadWeekly = async () => {
    setWeeklyLoading(true);
    try {
      const res = await axios.get("/api/weekly-notes", {
        headers: { "x-secret": secret },
      });
      setWeeklyContent(res.data.content || getWeeklyTemplate());
    } catch (e) {
      console.error(e);
      setWeeklyContent(getWeeklyTemplate());
    } finally {
      setWeeklyLoading(false);
    }
  };

  const getWeeklyTemplate = () => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1));
    const yyyy = monday.getFullYear();
    const mm = String(monday.getMonth() + 1).padStart(2, '0');
    const dd = String(monday.getDate()).padStart(2, '0');
    const weekStart = `${yyyy}-${mm}-${dd}`;
    
    return `# Weekly Tracker - ${weekStart}

## 🎯 Goals This Week
- [ ] Goal 1: 
- [ ] Goal 2: 
- [ ] Goal 3: 

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
  };

  const saveWeekly = async () => {
    if (!weeklyContent.trim()) {
      setWeeklyMsg("❗ Nothing to save");
      return;
    }
    setWeeklySaving(true);
    setWeeklyMsg("");
    try {
      await axios.post(
        "/api/weekly-notes",
        { content: weeklyContent },
        { headers: { "x-secret": secret } }
      );
      setWeeklyMsg("✅ Weekly plan saved!");
      setTimeout(() => setWeeklyMsg(""), 1500);
    } catch (e) {
      console.error(e);
      setWeeklyMsg("❗ Failed to save weekly plan");
    } finally {
      setWeeklySaving(false);
    }
  };

  if (loading) return (
    <div style={styles.loadingContainer}>
      <p style={styles.loadingText}>Loading…</p>
    </div>
  );

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>📊 Daily Tracker Dashboard</h1>
        <div style={styles.tabContainer}>
          <button 
            onClick={() => setActiveTab("tracker")}
            style={activeTab === "tracker" ? styles.activeTab : styles.tab}
          >
            📝 Tracker
          </button>
          <button 
            onClick={() => setActiveTab("ai")}
            style={activeTab === "ai" ? styles.activeTab : styles.tab}
          >
            🤖 AI Planner
          </button>
          <button 
            onClick={() => { setActiveTab("weekly"); loadWeekly(); }}
            style={activeTab === "weekly" ? styles.activeTab : styles.tab}
          >
            📅 Weekly Tracker
          </button>
        </div>
        <button onClick={() => window.location.href = "/history"} style={styles.historyBtn}>
          📜 History
        </button>
      </header>

      {activeTab === "tracker" && (
        <main style={styles.main}>
          <div style={styles.editorHeader}>
            <div style={styles.buttonGroup}>
              <button onClick={() => setPreviewMode(!previewMode)} style={styles.secondaryBtn}>
                {previewMode ? "✏️ Edit" : "👁️ Preview"}
              </button>
              <button onClick={save} disabled={saving} style={saving ? styles.saveBtnDisabled : styles.saveBtn}>
                {saving ? "Saving…" : "💾 Save & New"}
              </button>
              <button onClick={appendEntry} disabled={saving} style={saving ? styles.saveBtnDisabled : styles.secondaryBtn}>
                {saving ? "Adding…" : "➕ Add Entry"}
              </button>
              <button onClick={loadTracker} style={styles.secondaryBtn}>
                🔄 Reload
              </button>
            </div>
            {msg && <span style={msg.includes("✅") ? styles.successMsg : styles.errorMsg}>{msg}</span>}
          </div>

          {previewMode ? (
            <div style={styles.previewContainer}>
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          ) : (
            <textarea
              style={styles.textarea}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start writing your daily tracker notes..."
            />
          )}
        </main>
      )}

      {activeTab === "ai" && (
        <main style={styles.main}>
          <div style={styles.aiContainer}>
            <div style={styles.aiInputSection}>
              <textarea
                style={styles.aiTextarea}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask the AI to help you plan your day, summarize your tracker, or suggest improvements..."
                rows={6}
              />
              <button 
                onClick={askAI} 
                disabled={aiLoading || !prompt.trim()} 
                style={aiLoading || !prompt.trim() ? styles.saveBtnDisabled : styles.saveBtn}
              >
                {aiLoading ? "🤔 Thinking…" : "🚀 Ask AI"}
              </button>
            </div>
            
            {aiResponse && (
              <div style={styles.aiResponseSection}>
                <h3 style={styles.aiResponseTitle}>AI Response:</h3>
                <div style={styles.aiResponseBox}>
                  <ReactMarkdown>{aiResponse}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        </main>
      )}

      {activeTab === "weekly" && (
        <main style={styles.main}>
          {weeklyLoading ? (
            <div style={styles.loadingContainer}>
              <p style={styles.loadingText}>Loading weekly tracker…</p>
            </div>
          ) : (
            <div style={styles.trackerContainer}>
              <div style={styles.editorHeader}>
                <div style={styles.buttonGroup}>
                  <button 
                    onClick={() => setWeeklyPreviewMode(!weeklyPreviewMode)} 
                    style={styles.secondaryBtn}
                  >
                    {weeklyPreviewMode ? "✏️ Edit" : "👁️ Preview"}
                  </button>
                  <button 
                    onClick={saveWeekly} 
                    disabled={weeklySaving} 
                    style={weeklySaving ? styles.saveBtnDisabled : styles.saveBtn}
                  >
                    {weeklySaving ? "Saving…" : "💾 Save Weekly Plan"}
                  </button>
                  <button onClick={loadWeekly} style={styles.secondaryBtn}>
                    🔄 Reload
                  </button>
                </div>
                {weeklyMsg && <span style={weeklyMsg.includes("✅") ? styles.successMsg : styles.errorMsg}>{weeklyMsg}</span>}
              </div>

              {weeklyPreviewMode ? (
                <div style={styles.previewContainer}>
                  <ReactMarkdown>{weeklyContent}</ReactMarkdown>
                </div>
              ) : (
                <textarea
                  style={styles.textarea}
                  value={weeklyContent}
                  onChange={(e) => setWeeklyContent(e.target.value)}
                  placeholder="Plan your week with goals, track progress, and reflect..."
                />
              )}
            </div>
          )}
        </main>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#f5f5f5",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  header: {
    backgroundColor: "#fff",
    padding: "1.5rem 2rem",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    marginBottom: "2rem",
  },
  title: {
    margin: "0 0 1rem 0",
    fontSize: "1.8rem",
    color: "#333",
  },
  tabContainer: {
    display: "flex",
    gap: "0.5rem",
  },
  tab: {
    padding: "0.5rem 1rem",
    border: "1px solid #ddd",
    backgroundColor: "#f9f9f9",
    cursor: "pointer",
    borderRadius: "6px",
    fontSize: "0.95rem",
  },
  activeTab: {
    padding: "0.5rem 1rem",
    border: "1px solid #0070f3",
    backgroundColor: "#0070f3",
    color: "#fff",
    cursor: "pointer",
    borderRadius: "6px",
    fontSize: "0.95rem",
  },
  main: {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "0 2rem 2rem",
  },
  editorHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
    flexWrap: "wrap" as const,
    gap: "0.5rem",
  },
  buttonGroup: {
    display: "flex",
    gap: "0.5rem",
    flexWrap: "wrap" as const,
  },
  secondaryBtn: {
    padding: "0.5rem 1rem",
    border: "1px solid #ddd",
    backgroundColor: "#fff",
    cursor: "pointer",
    borderRadius: "6px",
    fontSize: "0.9rem",
  },
  saveBtn: {
    padding: "0.5rem 1.5rem",
    backgroundColor: "#0070f3",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    borderRadius: "6px",
    fontSize: "0.95rem",
    fontWeight: "bold" as const,
  },
  saveBtnDisabled: {
    padding: "0.5rem 1.5rem",
    backgroundColor: "#ccc",
    color: "#666",
    border: "none",
    cursor: "not-allowed",
    borderRadius: "6px",
    fontSize: "0.95rem",
  },
  successMsg: {
    marginLeft: "1rem",
    color: "#22c55e",
    fontWeight: "bold" as const,
  },
  errorMsg: {
    marginLeft: "1rem",
    color: "#ef4444",
    fontWeight: "bold" as const,
  },
  textarea: {
    width: "100%",
    minHeight: "500px",
    fontFamily: "monospace",
    fontSize: "0.95rem",
    lineHeight: "1.6",
    padding: "1rem",
    border: "1px solid #ddd",
    borderRadius: "8px",
    resize: "vertical" as const,
  },
  previewContainer: {
    backgroundColor: "#fff",
    padding: "2rem",
    borderRadius: "8px",
    border: "1px solid #ddd",
    minHeight: "500px",
    lineHeight: "1.6",
  },
  trackerContainer: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "1rem",
  },
  aiContainer: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "2rem",
  },
  aiInputSection: {
    backgroundColor: "#fff",
    padding: "1.5rem",
    borderRadius: "8px",
    border: "1px solid #ddd",
  },
  aiTextarea: {
    width: "100%",
    fontFamily: "inherit",
    fontSize: "0.95rem",
    lineHeight: "1.6",
    padding: "1rem",
    border: "1px solid #ddd",
    borderRadius: "6px",
    resize: "vertical" as const,
    marginBottom: "1rem",
  },
  aiResponseSection: {
    backgroundColor: "#fff",
    padding: "1.5rem",
    borderRadius: "8px",
    border: "1px solid #ddd",
  },
  aiResponseTitle: {
    margin: "0 0 1rem 0",
    fontSize: "1.1rem",
    color: "#333",
  },
  aiResponseBox: {
    backgroundColor: "#f9f9f9",
    padding: "1.5rem",
    borderRadius: "6px",
    lineHeight: "1.6",
  },
  loadingContainer: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    fontSize: "1.2rem",
    color: "#666",
  },
  historyBtn: {
    padding: "0.5rem 1rem",
    border: "1px solid #ddd",
    backgroundColor: "#fff",
    cursor: "pointer",
    borderRadius: "6px",
    fontSize: "0.9rem",
    marginLeft: "auto",
  },
};
