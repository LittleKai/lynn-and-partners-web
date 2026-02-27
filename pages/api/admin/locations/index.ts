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

  switch (req.method) {
    case "GET": {
      const locations = await prisma.location.findMany({
        orderBy: { createdAt: "desc" },
      });
      return res.status(200).json({ locations });
    }

    case "POST": {
      const { name, type, currency, description, address } = req.body;
      if (!name) {
        return res.status(400).json({ error: "name is required" });
      }

      const location = await prisma.location.create({
        data: {
          name,
          type: type || "warehouse",
          currency: currency || "VND",
          description: description || null,
          address: address || null,
          adminId: session.id,
          createdAt: new Date(),
        },
      });
      return res.status(201).json({ location });
    }

    default:
      return res.status(405).json({ error: "Method Not Allowed" });
  }
}
