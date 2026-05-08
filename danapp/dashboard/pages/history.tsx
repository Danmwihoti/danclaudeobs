import { useEffect, useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";

const secret = process.env.NEXT_PUBLIC_DASHBOARD_SECRET || "";

export default function HistoryPage() {
  const [trackerEntries, setTrackerEntries] = useState<any[]>([]);
  const [aiEntries, setAiEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"tracker" | "ai">("tracker");
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      // Load tracker entries
      const trackerRes = await axios.get("/api/notes", {
        headers: { "x-secret": secret },
      });
      const trackerContent = trackerRes.data.content;
      const parsedTracker = parseTrackerEntries(trackerContent);
      setTrackerEntries(parsedTracker);

      // Load AI conversation history
      const aiRes = await axios.get("/api/ai-history", {
        headers: { "x-secret": secret },
      });
      const aiContent = aiRes.data.content;
      const parsedAI = parseAIEntries(aiContent);
      setAiEntries(parsedAI);
    } catch (e) {
      console.error("Failed to load history:", e);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (raw: string) => {
    if (!raw || raw === "N/A") return "N/A";
    // Try "YYYY-MM-DD HH:MM" format (sub-entries)
    const tsMatch = raw.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/);
    if (tsMatch) {
      const [_, y, m, d, h, min] = tsMatch;
      const date = new Date(`${y}-${m}-${d}T${h}:${min}:00`);
      return date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
    }
    // Try "YYYY-MM-DD" format (daily tracker header)
    const dayMatch = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (dayMatch) {
      const [_, y, m, d] = dayMatch;
      const date = new Date(`${y}-${m}-${d}`);
      return date.toLocaleDateString("en-US", { dateStyle: "full" });
    }
    return raw;
  };

  const parseTrackerEntries = (content: string) => {
    if (!content) return [];
    const entries: any[] = [];

    // 1. Extract main Daily Tracker date from header: # Daily Tracker - YYYY-MM-DD
    const headerMatch = content.match(/^# Daily Tracker - (\d{4}-\d{2}-\d{2})/m);
    const dailyDate = headerMatch ? headerMatch[1] : null;

    // 2. Split content into main section (before first ---) and sub-entries (after ---)
    const [mainContent, ...subSections] = content.split(/\n---\n/);

    // 3. Add main daily tracker entry (if exists)
    if (mainContent.trim()) {
      entries.push({
        id: "main-" + (dailyDate || "unknown"),
        timestamp: dailyDate || "N/A",
        content: mainContent.replace(/^# Daily Tracker - \d{4}-\d{2}-\d{2}\n*/, "").trim(),
        formattedTime: formatTimestamp(dailyDate || "N/A"),
      });
    }

    // 4. Parse sub-entries (### Entry: timestamp)
    const entryRegex = /### Entry: (.+?)\n\n([\s\S]*?)(?=\n### Entry:|$)/g;
    let match;
    while ((match = entryRegex.exec(subSections.join("\n---\n"))) !== null) {
      entries.push({
        id: match[1],
        timestamp: match[1],
        content: match[2].trim(),
        formattedTime: formatTimestamp(match[1]),
      });
    }

    // 5. Fallback if no entries found at all
    if (entries.length === 0 && content.trim()) {
      entries.push({
        id: "single",
        timestamp: dailyDate || "N/A",
        content: content.trim(),
        formattedTime: formatTimestamp(dailyDate || "N/A"),
      });
    }

    return entries.reverse(); // Newest first
  };

  const parseAIEntries = (content: string) => {
    if (!content) return [];
    const entries: any[] = [];
    // Split by ---\n### AI Interaction:
    const parts = content.split(/\n---\n### AI Interaction: /);
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      const firstLineEnd = part.indexOf("\n");
      const timestamp = part.substring(0, firstLineEnd).trim();
      const rest = part.substring(firstLineEnd + 1);
      // Extract prompt and response
      const promptMatch = rest.match(/\*\*Prompt:\*\*\n([\s\S]*?)\n\*\*Response:\*\*/);
      const responseMatch = rest.match(/\*\*Response:\*\*\n([\s\S]*?)(?=\n---\n|$)/);
      entries.push({
        id: `ai-${i}`,
        timestamp,
        prompt: promptMatch ? promptMatch[1].trim() : "",
        response: responseMatch ? responseMatch[1].trim() : rest,
        model: (rest.match(/\*\*Model:\*\* (.+?)\n/)?.[1]) || "unknown",
      });
    }
    return entries.reverse(); // Newest first
  };

  const toggleExpand = (id: string) => {
    setExpandedEntry(expandedEntry === id ? null : id);
  };

  if (loading) return (
    <div style={styles.loadingContainer}>
      <p style={styles.loadingText}>Loading history…</p>
    </div>
  );

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
        <button onClick={() => window.location.href = "/"} style={styles.backBtn}>
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
                  <div style={styles.entryHeader} onClick={() => toggleExpand(entry.id)}>
                    <span style={styles.entryTime}>📅 {entry.formattedTime}</span>
                    <span style={styles.expandIcon}>{expandedEntry === entry.id ? "▼" : "▶"}</span>
                  </div>
                  {expandedEntry === entry.id && (
                    <div style={styles.entryContent}>
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
                  <div style={styles.entryHeader} onClick={() => toggleExpand(entry.id)}>
                    <span style={styles.entryTime}>🤖 {entry.timestamp}</span>
                    <span style={styles.entryModel}>Model: {entry.model}</span>
                    <span style={styles.expandIcon}>{expandedEntry === entry.id ? "▼" : "▶"}</span>
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
    padding: "1rem",
    cursor: "pointer",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderBottom: "1px solid #ddd",
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
  },
  entryContent: {
    padding: "1rem",
    lineHeight: "1.6",
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
