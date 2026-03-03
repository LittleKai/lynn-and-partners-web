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
  const session = await getSessionServer(req, res);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const { id: locationId, announcementId } = req.query;
  if (
    !locationId ||
    typeof locationId !== "string" ||
    !announcementId ||
    typeof announcementId !== "string"
  ) {
    return res.status(400).json({ error: "Invalid parameters" });
  }

  // Only admin/superadmin can modify announcements
  if (session.role !== "superadmin" && session.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }

  const canAccess = await hasLocationAccess(session, locationId);
  if (!canAccess) return res.status(403).json({ error: "Forbidden" });

  const item = await prisma.locationAnnouncement.findFirst({
    where: { id: announcementId, locationId },
  });
  if (!item) return res.status(404).json({ error: "Announcement not found" });

  if (req.method === "PUT") {
    const { title, content, type } = req.body as {
      title?: string;
      content?: string;
      type?: string;
    };

    const updated = await prisma.locationAnnouncement.update({
      where: { id: announcementId },
      data: {
        ...(title?.trim() ? { title: title.trim() } : {}),
        ...(content?.trim() ? { content: content.trim() } : {}),
        ...(type ? { type } : {}),
      },
    });

    return res.status(200).json({ announcement: updated });
  }

  if (req.method === "DELETE") {
    await prisma.locationAnnouncement.delete({ where: { id: announcementId } });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: "Method Not Allowed" });
}
