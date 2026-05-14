import { useEffect, useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { useRouter } from "next/router";

const secret = process.env.NEXT_PUBLIC_DASHBOARD_SECRET || "";

type TrackerEntry = {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  createdAt: string;
};

type AiEntry = {
  id: string;
  timestamp: string;
  prompt: string;
  response: string;
  model: string;
};

export default function HistoryPage() {
  const router = useRouter();
  const [trackerEntries, setTrackerEntries] = useState<TrackerEntry[]>([]);
  const [aiEntries, setAiEntries] = useState<AiEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"tracker" | "ai">("tracker");
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const trackerRes = await axios.get("/api/notes", {
        headers: { "x-secret": secret },
      });
      const savedPlans = (trackerRes.data.savedPlans || []).map((plan: any) => ({
        id: plan.id,
        title: plan.title,
        content: stripTrackerHeading(plan.content),
        updatedAt: plan.updatedAt,
        createdAt: plan.createdAt,
      }));
      setTrackerEntries(savedPlans);

      const aiRes = await axios.get("/api/ai-history", {
        headers: { "x-secret": secret },
      });
      const aiContent = aiRes.data.content;
      setAiEntries(parseAIEntries(aiContent));
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setLoading(false);
    }
  };

  const parseAIEntries = (content: string) => {
    if (!content) return [];
    const entries: AiEntry[] = [];
    const parts = content.split(/\n---\n### AI Interaction: /);
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      const firstLineEnd = part.indexOf("\n");
      const timestamp = part.substring(0, firstLineEnd).trim();
      const rest = part.substring(firstLineEnd + 1);
      const promptMatch = rest.match(/\*\*Prompt:\*\*\n([\s\S]*?)\n\*\*Response:\*\*/);
      const responseMatch = rest.match(/\*\*Response:\*\*\n([\s\S]*?)(?=\n---\n|$)/);
      entries.push({
        id: `ai-${i}`,
        timestamp,
        prompt: promptMatch ? promptMatch[1].trim() : "",
        response: responseMatch ? responseMatch[1].trim() : rest,
        model: rest.match(/\*\*Model:\*\* (.+?)\n/)?.[1] || "unknown",
      });
    }
    return entries.reverse();
  };

  const stripTrackerHeading = (content: string) => {
    return content
      .replace(/^# Daily Tracker - \d{4}-\d{2}-\d{2}\n*/, "")
      .replace(/^# \d{4}-\d{2}-\d{2} - Daily Tracker\n*/, "")
      .trim();
  };

  const formatTrackerDate = (value: string) => {
    return new Date(value).toLocaleDateString("en-US", { dateStyle: "full" });
  };

  const toggleExpand = (id: string) => {
    setExpandedEntry(expandedEntry === id ? null : id);
  };

  const editTrackerEntry = (id: string) => {
    router.push(`/?planId=${id}`);
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <p style={styles.loadingText}>Loading history…</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>📜 Activity History</h1>
        <div style={styles.tabContainer}>
          <button
            onClick={() => setActiveTab("tracker")}
            style={activeTab === "tracker" ? styles.activeTab : styles.tab}
          >
            📝 Tracker Entries ({trackerEntries.length})
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            style={activeTab === "ai" ? styles.activeTab : styles.tab}
          >
            🤖 AI Conversations ({aiEntries.length})
          </button>
        </div>
        <button onClick={() => router.push("/")} style={styles.backBtn}>
          ← Back to Dashboard
        </button>
      </header>

      <main style={styles.main}>
        {activeTab === "tracker" && (
          <div style={styles.entriesContainer}>
            {trackerEntries.length === 0 ? (
              <p style={styles.emptyMsg}>No tracker entries yet. Start tracking on the dashboard!</p>
            ) : (
              trackerEntries.map((entry) => (
                <div key={entry.id} style={styles.entryCard}>
                  <div style={styles.entryHeader}>
                    <button style={styles.entryHeaderMain} onClick={() => toggleExpand(entry.id)}>
                      <span style={styles.entryTime}>📅 {formatTrackerDate(entry.updatedAt)}</span>
                      <span style={styles.expandIcon}>{expandedEntry === entry.id ? "▼" : "▶"}</span>
                    </button>
                    <button style={styles.editBtn} onClick={() => editTrackerEntry(entry.id)}>
                      ✏️ Edit
                    </button>
                  </div>
                  {expandedEntry === entry.id && (
                    <div style={styles.entryContent}>
                      <h3 style={styles.entryTitle}>{entry.title}</h3>
                      <ReactMarkdown>{entry.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "ai" && (
          <div style={styles.entriesContainer}>
            {aiEntries.length === 0 ? (
              <p style={styles.emptyMsg}>No AI conversations yet. Ask the AI on the dashboard!</p>
            ) : (
              aiEntries.map((entry) => (
                <div key={entry.id} style={styles.entryCard}>
                  <div style={styles.entryHeader}>
                    <button style={styles.entryHeaderMain} onClick={() => toggleExpand(entry.id)}>
                      <span style={styles.entryTime}>🤖 {entry.timestamp}</span>
                      <span style={styles.entryModel}>Model: {entry.model}</span>
                      <span style={styles.expandIcon}>{expandedEntry === entry.id ? "▼" : "▶"}</span>
                    </button>
                  </div>
                  {expandedEntry === entry.id && (
                    <div style={styles.entryContent}>
                      <div style={styles.promptSection}>
                        <strong>Prompt:</strong>
                        <ReactMarkdown>{entry.prompt}</ReactMarkdown>
                      </div>
                      <div style={styles.responseSection}>
                        <strong>Response:</strong>
                        <ReactMarkdown>{entry.response}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </main>
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
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap" as const,
    gap: "1rem",
  },
  title: {
    margin: 0,
    fontSize: "1.8rem",
    color: "#333",
    width: "100%",
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
  backBtn: {
    padding: "0.5rem 1rem",
    border: "1px solid #ddd",
    backgroundColor: "#fff",
    cursor: "pointer",
    borderRadius: "6px",
    fontSize: "0.9rem",
  },
  main: {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "0 2rem 2rem",
  },
  entriesContainer: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "1rem",
  },
  entryCard: {
    backgroundColor: "#fff",
    borderRadius: "8px",
    border: "1px solid #ddd",
    overflow: "hidden",
  },
  entryHeader: {
    display: "flex",
    alignItems: "stretch",
    backgroundColor: "#f9f9f9",
    borderBottom: "1px solid #ddd",
  },
  entryHeaderMain: {
    padding: "1rem",
    cursor: "pointer",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "transparent",
    border: "none",
    flex: 1,
    textAlign: "left" as const,
  },
  editBtn: {
    padding: "0.75rem 1rem",
    border: "none",
    borderLeft: "1px solid #ddd",
    backgroundColor: "#eef6ff",
    color: "#0f4c81",
    cursor: "pointer",
    fontSize: "0.9rem",
    fontWeight: "bold" as const,
  },
  entryTime: {
    fontWeight: "bold" as const,
    color: "#333",
  },
  entryModel: {
    fontSize: "0.85rem",
    color: "#666",
    marginLeft: "1rem",
  },
  expandIcon: {
    color: "#666",
    marginLeft: "auto",
  },
  entryContent: {
    padding: "1rem",
    lineHeight: "1.6",
  },
  entryTitle: {
    margin: "0 0 1rem 0",
    color: "#111827",
    fontSize: "1.1rem",
  },
  promptSection: {
    marginBottom: "1rem",
    padding: "1rem",
    backgroundColor: "#f0f7ff",
    borderRadius: "6px",
  },
  responseSection: {
    padding: "1rem",
    backgroundColor: "#f0fff4",
    borderRadius: "6px",
  },
  emptyMsg: {
    textAlign: "center" as const,
    color: "#666",
    padding: "2rem",
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
};
