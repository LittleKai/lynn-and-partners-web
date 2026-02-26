import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { getSessionServer } from "@/utils/auth";

const prisma = new PrismaClient();

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

  const location = await prisma.location.findUnique({ where: { id } });
  if (!location) return res.status(404).json({ error: "Location not found" });

  // Admin can only manage their own locations
  if (session.role === "admin" && location.adminId !== session.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  switch (req.method) {
    case "GET": {
      return res.status(200).json({ location });
    }

    case "PUT": {
      const { name, type, description, address } = req.body;
      const updated = await prisma.location.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(type && { type }),
          ...(description !== undefined && { description }),
          ...(address !== undefined && { address }),
        },
      });
      return res.status(200).json({ location: updated });
    }

    case "DELETE": {
      await prisma.location.delete({ where: { id } });
      return res.status(200).json({ success: true });
    }

    default:
      return res.status(405).json({ error: "Method Not Allowed" });
  }
}
