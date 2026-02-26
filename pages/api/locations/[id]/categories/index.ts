import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { getSessionServer } from "@/utils/auth";
import { hasLocationAccess, PERMISSIONS } from "@/utils/permissions";

const prisma = new PrismaClient();

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

  const canView = await hasLocationAccess(session, locationId);
  if (!canView) return res.status(403).json({ error: "Forbidden" });

  switch (req.method) {
    case "GET": {
      const categories = await prisma.category.findMany({
        where: { locationId },
        orderBy: { name: "asc" },
      });
      return res.status(200).json({ categories });
    }

    case "POST": {
      const canManage = await hasLocationAccess(
        session,
        locationId,
        PERMISSIONS.MANAGE_CATEGORIES
      );
      if (!canManage) return res.status(403).json({ error: "Forbidden" });

      const { name } = req.body;
      if (!name) return res.status(400).json({ error: "name is required" });

      const category = await prisma.category.create({
        data: { locationId, name },
      });
      return res.status(201).json({ category });
    }

    case "PUT": {
      const canManage = await hasLocationAccess(
        session,
        locationId,
        PERMISSIONS.MANAGE_CATEGORIES
      );
      if (!canManage) return res.status(403).json({ error: "Forbidden" });

      const { categoryId, name } = req.body;
      if (!categoryId || !name)
        return res.status(400).json({ error: "categoryId and name required" });

      const updated = await prisma.category.update({
        where: { id: categoryId },
        data: { name },
      });
      return res.status(200).json({ category: updated });
    }

    case "DELETE": {
      const canManage = await hasLocationAccess(
        session,
        locationId,
        PERMISSIONS.MANAGE_CATEGORIES
      );
      if (!canManage) return res.status(403).json({ error: "Forbidden" });

      const { categoryId } = req.query;
      if (!categoryId || typeof categoryId !== "string")
        return res.status(400).json({ error: "categoryId required" });

      await prisma.category.delete({ where: { id: categoryId } });
      return res.status(200).json({ success: true });
    }

    default:
      return res.status(405).json({ error: "Method Not Allowed" });
  }
}
