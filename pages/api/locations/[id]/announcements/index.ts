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

  const { id: locationId } = req.query;
  if (!locationId || typeof locationId !== "string") {
    return res.status(400).json({ error: "Invalid location id" });
  }

  const canAccess = await hasLocationAccess(session, locationId);
  if (!canAccess) return res.status(403).json({ error: "Forbidden" });

  switch (req.method) {
    case "GET": {
      const announcements = await prisma.locationAnnouncement.findMany({
        where: { locationId },
        orderBy: { createdAt: "desc" },
      });
      return res.status(200).json({ announcements });
    }

    case "POST": {
      // Only admin/superadmin can create announcements
      if (session.role !== "superadmin" && session.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { title, content, type } = req.body as {
        title: string;
        content: string;
        type?: string;
      };

      if (!title?.trim() || !content?.trim()) {
        return res.status(400).json({ error: "title and content are required" });
      }

      const announcement = await prisma.locationAnnouncement.create({
        data: {
          locationId,
          title: title.trim(),
          content: content.trim(),
          type: type || "info",
          createdById: session.id,
          createdByName: session.name,
        },
      });

      return res.status(201).json({ announcement });
    }

    default:
      return res.status(405).json({ error: "Method Not Allowed" });
  }
}
