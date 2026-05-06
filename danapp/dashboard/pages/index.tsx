import { useEffect, useState } from "react";
import axios from "axios";

const secret = process.env.NEXT_PUBLIC_DASHBOARD_SECRET || "";

export default function TrackerPage() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
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
    })();
  }, []);

  const save = async () => {
    try {
      await axios.post(
        "/api/notes",
        { content },
        { headers: { "x-secret": secret } }
      );
      setMsg("✅ Saved");
    } catch (e) {
      console.error(e);
      setMsg("❗ Save failed");
    }
  };

  if (loading) return <p>Loading…</p>;

  return (
    <main style={{ padding: "2rem", maxWidth: "800px", margin: "auto" }}>
      <h1>Daily Tracker</h1>
      <textarea
        rows={30}
        style={{
          width: "100%",
          fontFamily: "monospace",
          fontSize: "0.95rem",
          lineHeight: "1.4",
        }}
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <div style={{ marginTop: "1rem" }}>
        <button onClick={save}>Save</button>
        {msg && <span style={{ marginLeft: "1rem" }}>{msg}</span>}
      </div>
    </main>
  );
}
