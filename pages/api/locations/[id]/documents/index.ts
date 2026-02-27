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

  // Documents tab is admin/superadmin only
  if (session.role !== "superadmin" && session.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }

  const canAccess = await hasLocationAccess(session, locationId);
  if (!canAccess) return res.status(403).json({ error: "Forbidden" });

  switch (req.method) {
    case "GET": {
      const documents = await prisma.locationDocument.findMany({
        where: { locationId },
        orderBy: { uploadedAt: "desc" },
      });
      return res.status(200).json({ documents });
    }

    case "POST": {
      const { name, url, resourceType } = req.body as {
        name: string;
        url: string;
        resourceType: string;
      };

      if (!name || !url) {
        return res.status(400).json({ error: "name and url are required" });
      }

      const document = await prisma.locationDocument.create({
        data: {
          locationId,
          name,
          url,
          resourceType: resourceType || "raw",
          uploadedById: session.id,
          uploadedByName: session.name,
          uploadedAt: new Date(),
        },
      });

      return res.status(201).json({ document });
    }

    default:
      return res.status(405).json({ error: "Method Not Allowed" });
  }
}
