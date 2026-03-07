import { NextApiRequest, NextApiResponse } from "next";

// ── In-memory error log (persists within the dev server process) ──────
interface ErrorLog {
  id: string;
  message: string;
  stack?: string;
  digest?: string;
  url?: string;
  userAgent?: string;
  timestamp: string;
}

// Module-level: shared across all requests in the same process (dev only)
const errorStore: ErrorLog[] = [];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Safety: only work in development
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ error: "Not found" });
  }

  // Allow cross-origin requests (phone → desktop)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "POST") {
    const entry: ErrorLog = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      message: req.body?.message || "Unknown error",
      stack: req.body?.stack,
      digest: req.body?.digest,
      url: req.body?.url,
      userAgent: req.body?.userAgent,
      timestamp: new Date().toISOString(),
    };
    errorStore.unshift(entry);
    if (errorStore.length > 100) errorStore.pop();
    return res.status(200).json({ ok: true });
  }

  if (req.method === "DELETE") {
    errorStore.length = 0;
    return res.status(200).json({ ok: true });
  }

  // GET — return all stored errors
  return res.status(200).json({ errors: errorStore });
}
