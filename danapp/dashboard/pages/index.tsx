import { useEffect, useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { useRouter } from "next/router";

const secret = process.env.NEXT_PUBLIC_DASHBOARD_SECRET || "";

type SavedPlan = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export default function TrackerPage() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"tracker" | "ai" | "weekly">("tracker");
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const [prompt, setPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const [weeklyContent, setWeeklyContent] = useState("");
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklySaving, setWeeklySaving] = useState(false);
  const [weeklyPreviewMode, setWeeklyPreviewMode] = useState(false);
  const [weeklyMsg, setWeeklyMsg] = useState("");

  useEffect(() => {
    loadTracker();
  }, [router.query.planId]);

  const loadTracker = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/notes", {
        headers: { "x-secret": secret },
      });

      const plans: SavedPlan[] = res.data.savedPlans || [];
      const requestedPlanId =
        typeof router.query.planId === "string" ? router.query.planId : null;
      const selectedPlan =
        plans.find((plan) => plan.id === requestedPlanId) ||
        plans.find((plan) => plan.id === res.data.activePlanId) ||
        null;

      setSavedPlans(plans);
      setContent(selectedPlan ? selectedPlan.content : res.data.content || getEmptyTemplate());
      setSelectedPlanId(selectedPlan ? selectedPlan.id : null);
    } catch (error) {
      console.error(error);
      setMsg("❗ Could not load tracker");
      setContent(getEmptyTemplate());
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
      const res = await axios.post(
        "/api/notes",
        { id: selectedPlanId, content },
        { headers: { "x-secret": secret } }
      );

      const savedPlan: SavedPlan = res.data.plan;
      setSelectedPlanId(savedPlan.id);
      setSavedPlans((current) => {
        const next = current.filter((plan) => plan.id !== savedPlan.id);
        next.unshift(savedPlan);
        return next;
      });
      setContent(savedPlan.content);
      setMsg(selectedPlanId ? "✅ Tracker updated" : "✅ Tracker saved");
    } catch (error) {
      console.error(error);
      setMsg("❗ Save failed");
    } finally {
      setSaving(false);
    }
  };

  const startNewTracker = () => {
    if (router.query.planId) {
      router.replace("/", undefined, { shallow: true });
    }
    setSelectedPlanId(null);
    setContent(getEmptyTemplate());
    setPreviewMode(false);
    setMsg("📝 New tracker ready");
  };

  const openSavedPlan = (plan: SavedPlan) => {
    setSelectedPlanId(plan.id);
    setContent(plan.content);
    setPreviewMode(false);
    setMsg(`📂 Editing ${plan.title}`);
    router.replace(`/?planId=${plan.id}`, undefined, { shallow: true });
  };

  const getEmptyTemplate = () => {
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
    } catch (error) {
      console.error(error);
      setAiResponse("❗ Error: Could not get AI response");
    } finally {
      setAiLoading(false);
    }
  };

  const loadWeekly = async () => {
    setWeeklyLoading(true);
    try {
      const res = await axios.get("/api/weekly-notes", {
        headers: { "x-secret": secret },
      });
      setWeeklyContent(res.data.content || getWeeklyTemplate());
    } catch (error) {
      console.error(error);
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
    } catch (error) {
      console.error(error);
      setWeeklyMsg("❗ Failed to save weekly plan");
    } finally {
      setWeeklySaving(false);
    }
  };

  const formatSavedPlanTime = (value: string) => {
    return new Date(value).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <p style={styles.loadingText}>Loading…</p>
      </div>
    );
  }

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
            onClick={() => {
              setActiveTab("weekly");
              loadWeekly();
            }}
            style={activeTab === "weekly" ? styles.activeTab : styles.tab}
          >
            📅 Weekly Tracker
          </button>
        </div>
        <button onClick={() => (window.location.href = "/history")} style={styles.historyBtn}>
          📜 History
        </button>
      </header>

      {activeTab === "tracker" && (
        <main style={styles.trackerWorkspace}>
          <aside style={styles.sidebar}>
            <div style={styles.sidebarHeader}>
              <h2 style={styles.sidebarTitle}>Saved</h2>
              <button onClick={startNewTracker} style={styles.newBtn}>
                ＋ New
              </button>
            </div>

            {savedPlans.length === 0 ? (
              <p style={styles.emptySidebarText}>No saved trackers yet.</p>
            ) : (
              <div style={styles.savedPlansList}>
                {savedPlans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => openSavedPlan(plan)}
                    style={plan.id === selectedPlanId ? styles.savedPlanItemActive : styles.savedPlanItem}
                  >
                    <span style={styles.savedPlanTitle}>{plan.title}</span>
                    <span style={styles.savedPlanMeta}>
                      Updated {formatSavedPlanTime(plan.updatedAt)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </aside>

          <section style={styles.editorPanel}>
            <div style={styles.editorHeader}>
              <div style={styles.buttonGroup}>
                <button onClick={() => setPreviewMode(!previewMode)} style={styles.secondaryBtn}>
                  {previewMode ? "✏️ Edit" : "👁️ Preview"}
                </button>
                <button onClick={save} disabled={saving} style={saving ? styles.saveBtnDisabled : styles.saveBtn}>
                  {saving ? "Saving…" : selectedPlanId ? "💾 Save" : "💾 Save"}
                </button>
                <button onClick={startNewTracker} style={styles.secondaryBtn}>
                  🆕 New
                </button>
                <button onClick={loadTracker} style={styles.secondaryBtn}>
                  🔄 Reload
                </button>
                <button
                  onClick={() => {
                    setActiveTab("ai");
                    setPrompt(
                      "Analyze my daily tracker entries and provide 3-5 actionable tips to improve my productivity, accomplish more goals, and address any blockers mentioned."
                    );
                  }}
                  style={styles.analyzeBtn}
                >
                  📊 Analyze My Day
                </button>
              </div>
              {msg && (
                <span
                  style={
                    msg.includes("✅")
                      ? styles.successMsg
                      : msg.includes("❗")
                        ? styles.errorMsg
                        : styles.infoMsg
                  }
                >
                  {msg}
                </span>
              )}
            </div>

            <div style={styles.activePlanBar}>
              <strong style={styles.activePlanLabel}>Editing:</strong>
              <span style={styles.activePlanValue}>
                {selectedPlanId
                  ? savedPlans.find((plan) => plan.id === selectedPlanId)?.title || "Saved tracker"
                  : "New unsaved tracker"}
              </span>
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
          </section>
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
                  <button onClick={() => setWeeklyPreviewMode(!weeklyPreviewMode)} style={styles.secondaryBtn}>
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
                  <button
                    onClick={() => {
                      setActiveTab("ai");
                      setPrompt(
                        "Analyze my weekly tracker goals, completed tasks, blockers, and reflections. Provide specific guidance to help me accomplish my goals, overcome challenges, and improve my accountability for next week."
                      );
                    }}
                    style={styles.analyzeBtn}
                  >
                    📊 Analyze My Week
                  </button>
                </div>
                {weeklyMsg && (
                  <span
                    style={
                      weeklyMsg.includes("✅")
                        ? styles.successMsg
                        : weeklyMsg.includes("❗")
                          ? styles.errorMsg
                          : styles.infoMsg
                    }
                  >
                    {weeklyMsg}
                  </span>
                )}
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
  trackerWorkspace: {
    maxWidth: "1280px",
    margin: "0 auto",
    padding: "0 2rem 2rem",
    display: "grid",
    gridTemplateColumns: "280px minmax(0, 1fr)",
    gap: "1.5rem",
    alignItems: "start",
  },
  sidebar: {
    backgroundColor: "#fff",
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "1rem",
    position: "sticky" as const,
    top: "1.5rem",
  },
  sidebarHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
    gap: "0.75rem",
  },
  sidebarTitle: {
    margin: 0,
    fontSize: "1rem",
    color: "#222",
  },
  newBtn: {
    padding: "0.45rem 0.8rem",
    backgroundColor: "#111827",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: "bold" as const,
  },
  savedPlansList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.6rem",
    maxHeight: "70vh",
    overflowY: "auto" as const,
  },
  savedPlanItem: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.25rem",
    width: "100%",
    textAlign: "left" as const,
    padding: "0.8rem",
    border: "1px solid #e5e7eb",
    backgroundColor: "#fafafa",
    borderRadius: "8px",
    cursor: "pointer",
  },
  savedPlanItemActive: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.25rem",
    width: "100%",
    textAlign: "left" as const,
    padding: "0.8rem",
    border: "1px solid #0070f3",
    backgroundColor: "#eff6ff",
    borderRadius: "8px",
    cursor: "pointer",
  },
  savedPlanTitle: {
    fontSize: "0.95rem",
    fontWeight: "bold" as const,
    color: "#111827",
  },
  savedPlanMeta: {
    fontSize: "0.78rem",
    color: "#6b7280",
  },
  emptySidebarText: {
    margin: 0,
    color: "#6b7280",
    fontSize: "0.9rem",
  },
  editorPanel: {
    minWidth: 0,
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
  analyzeBtn: {
    padding: "0.5rem 1rem",
    backgroundColor: "#10b981",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    borderRadius: "6px",
    fontSize: "0.9rem",
    fontWeight: "bold" as const,
  },
  successMsg: {
    marginLeft: "1rem",
    color: "#22c55e",
    fontWeight: "bold" as const,
  },
  infoMsg: {
    marginLeft: "1rem",
    color: "#374151",
    fontWeight: "bold" as const,
  },
  errorMsg: {
    marginLeft: "1rem",
    color: "#ef4444",
    fontWeight: "bold" as const,
  },
  activePlanBar: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    marginBottom: "0.8rem",
    padding: "0.8rem 1rem",
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
  },
  activePlanLabel: {
    color: "#374151",
  },
  activePlanValue: {
    color: "#111827",
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
