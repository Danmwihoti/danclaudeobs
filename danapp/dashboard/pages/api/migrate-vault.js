import { importVaultDocuments } from "../../lib/storage";

export default async function handler(req, res) {
  if (req.headers["x-secret"] !== process.env.DASHBOARD_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const overwrite = req.body?.overwrite !== false;
    const results = await importVaultDocuments({ overwrite });
    return res.status(200).json({ ok: true, results });
  } catch (error) {
    console.error("Failed to migrate vault documents:", error);
    return res.status(500).json({ error: error.message });
  }
}
