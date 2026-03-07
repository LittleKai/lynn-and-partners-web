import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient() as any;

const COLLECTION = "DevError";

interface ErrorLog {
  id: string;
  message: string;
  stack?: string;
  digest?: string;
  url?: string;
  userAgent?: string;
  timestamp: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
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

      await prisma.$runCommandRaw({ insert: COLLECTION, documents: [entry] });

      // Keep collection small — drop entries older than 6 hours
      const cutoff = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
      await prisma.$runCommandRaw({
        delete: COLLECTION,
        deletes: [{ q: { timestamp: { $lt: cutoff } }, limit: 0 }],
      });

      return res.status(200).json({ ok: true });
    }

    if (req.method === "DELETE") {
      await prisma.$runCommandRaw({
        delete: COLLECTION,
        deletes: [{ q: {}, limit: 0 }],
      });
      return res.status(200).json({ ok: true });
    }

    // GET
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await prisma.$runCommandRaw({
      find: COLLECTION,
      sort: { timestamp: -1 },
      limit: 100,
    }) as any;

    const errors: ErrorLog[] = result?.cursor?.firstBatch ?? [];
    return res.status(200).json({ errors });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
}
