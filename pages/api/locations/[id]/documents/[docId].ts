import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { getSessionServer } from "@/utils/auth";
import { hasLocationAccess } from "@/utils/permissions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient() as any;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const session = await getSessionServer(req, res);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { id: locationId, docId } = req.query;
  if (
    !locationId ||
    typeof locationId !== "string" ||
    !docId ||
    typeof docId !== "string"
  ) {
    return res.status(400).json({ error: "Invalid parameters" });
  }

  // Documents tab is admin/superadmin only
  if (session.role !== "superadmin" && session.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }

  const canAccess = await hasLocationAccess(session, locationId);
  if (!canAccess) return res.status(403).json({ error: "Forbidden" });

  const doc = await prisma.locationDocument.findFirst({
    where: { id: docId, locationId },
  });
  if (!doc) return res.status(404).json({ error: "Document not found" });

  await prisma.locationDocument.delete({ where: { id: docId } });

  return res.status(200).json({ success: true });
}
