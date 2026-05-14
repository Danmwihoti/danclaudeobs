import {
  getDocument,
  getLatestTrackerPlan,
  getLocalDocument,
  listTrackerPlans,
  saveTrackerPlan,
  setLocalDocument,
  setDocument,
} from "../../lib/storage";

export default async function handler(req, res) {
  if (req.headers["x-secret"] !== process.env.DASHBOARD_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }

  if (req.method === "GET") {
    try {
      const [content, savedPlans, latestPlan] = await Promise.all([
        getDocument("daily_tracker"),
        listTrackerPlans(),
        getLatestTrackerPlan(),
      ]);
      return res.status(200).json({
        content,
        savedPlans: savedPlans.map((plan) => ({
          id: String(plan.id),
          title: plan.title,
          content: plan.content,
          createdAt: plan.created_at,
          updatedAt: plan.updated_at,
        })),
        activePlanId: latestPlan ? String(latestPlan.id) : null,
      });
    } catch (error) {
      console.error("Failed to load daily tracker from database, falling back to local vault:", error);
      try {
        const content = await getLocalDocument("daily_tracker");
        return res.status(200).json({
          content,
          savedPlans: [],
          activePlanId: null,
          fallback: "local-vault",
        });
      } catch (localError) {
        console.error("Failed to load daily tracker locally:", localError);
        return res.status(500).json({ error: localError.message });
      }
    }
  }

  if (req.method === "POST") {
    const { id, content } = req.body;
    if (typeof content !== "string") {
      return res.status(400).json({ error: "content must be a string" });
    }

    try {
      const savedPlan = await saveTrackerPlan({ id, content });
      return res.status(200).json({
        ok: true,
        plan: {
          id: String(savedPlan.id),
          title: savedPlan.title,
          content: savedPlan.content,
          createdAt: savedPlan.created_at,
          updatedAt: savedPlan.updated_at,
        },
      });
    } catch (error) {
      console.error("Failed to save daily tracker to database, falling back to local vault:", error);
      if (id) {
        return res.status(500).json({
          error: "Database unreachable. Editing saved tracker plans requires database access.",
        });
      }

      try {
        await setLocalDocument("daily_tracker", content);
        return res.status(200).json({
          ok: true,
          plan: {
            id: null,
            title: content.split("\n")[0]?.replace(/^#\s*/, "").trim() || "Local tracker",
            content,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          fallback: "local-vault",
        });
      } catch (localError) {
        console.error("Failed to save daily tracker locally:", localError);
        return res.status(500).json({ error: localError.message });
      }
    }
  }

  if (req.method === "PUT") {
    const { content } = req.body;
    if (typeof content !== "string") {
      return res.status(400).json({ error: "content must be a string" });
    }

    try {
      await setDocument("daily_tracker", content);
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error("Failed to update active daily tracker in database, falling back to local vault:", error);
      try {
        await setLocalDocument("daily_tracker", content);
        return res.status(200).json({ ok: true, fallback: "local-vault" });
      } catch (localError) {
        console.error("Failed to update active daily tracker locally:", localError);
        return res.status(500).json({ error: localError.message });
      }
    }
  }

  res.setHeader("Allow", ["GET", "POST", "PUT"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
