import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { getSessionServer } from "@/utils/auth";

const prisma = new PrismaClient();

/**
 * GET  /api/admin/users/[id]/access — get user's location access list
 * PUT  /api/admin/users/[id]/access — set user's access (locationId + permissions)
 *
 * PUT body: { access: [{ locationId: string, permissions: string[] }] }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSessionServer(req, res);
  if (!session) return res.status(401).json({ error: "Unauthorized" });
  if (session.role !== "admin" && session.role !== "superadmin")
    return res.status(403).json({ error: "Forbidden" });

  const { id } = req.query;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Invalid id" });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || target.role !== "user") {
    return res.status(404).json({ error: "User not found" });
  }

  if (session.role === "admin" && target.createdById !== session.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  switch (req.method) {
    case "GET": {
      const accessList = await prisma.userLocationAccess.findMany({
        where: { userId: id },
      });
      return res.status(200).json({ access: accessList });
    }

    case "PUT": {
      const { access } = req.body as {
        access: { locationId: string; permissions: string[] }[];
      };
      if (!Array.isArray(access)) {
        return res.status(400).json({ error: "access must be an array" });
      }

      // Delete existing access and recreate
      await prisma.userLocationAccess.deleteMany({ where: { userId: id } });

      if (access.length > 0) {
        await prisma.userLocationAccess.createMany({
          data: access.map((a) => ({
            userId: id,
            locationId: a.locationId,
            permissions: a.permissions || [],
          })),
        });
      }

      const updated = await prisma.userLocationAccess.findMany({
        where: { userId: id },
      });
      return res.status(200).json({ access: updated });
    }

    default:
      return res.status(405).json({ error: "Method Not Allowed" });
  }
}
