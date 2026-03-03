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
      const rooms = await prisma.room.findMany({
        where: { locationId },
        orderBy: { number: "asc" },
      });
      return res.status(200).json({ rooms });
    }

    case "POST": {
      const { number, pricePerNight, pricePerMonth, notes } = req.body as {
        number: string;
        pricePerNight?: number;
        pricePerMonth?: number;
        notes?: string;
      };
      if (!number?.trim()) {
        return res.status(400).json({ error: "Room number is required" });
      }

      // Prevent duplicate room numbers within the same location
      const existing = await prisma.room.findFirst({
        where: { locationId, number: number.trim() },
      });
      if (existing) {
        return res.status(409).json({ error: "Room number already exists" });
      }

      const room = await prisma.room.create({
        data: {
          locationId,
          number: number.trim(),
          status: "available",
          pricePerNight: pricePerNight ? Number(pricePerNight) : null,
          pricePerMonth: pricePerMonth ? Number(pricePerMonth) : null,
          notes: notes || null,
        },
      });
      return res.status(201).json({ room });
    }

    default:
      return res.status(405).json({ error: "Method Not Allowed" });
  }
}
