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

  const { id: locationId, roomId } = req.query;
  if (
    !locationId || typeof locationId !== "string" ||
    !roomId || typeof roomId !== "string"
  ) {
    return res.status(400).json({ error: "Invalid parameters" });
  }

  const canAccess = await hasLocationAccess(session, locationId);
  if (!canAccess) return res.status(403).json({ error: "Forbidden" });

  const room = await prisma.room.findFirst({ where: { id: roomId, locationId } });
  if (!room) return res.status(404).json({ error: "Room not found" });

  switch (req.method) {
    case "PUT": {
      const { number, status, pricePerNight, pricePerMonth, notes } = req.body as {
        number?: string;
        status?: string;
        pricePerNight?: number | null;
        pricePerMonth?: number | null;
        notes?: string | null;
      };

      // Check duplicate number if changing
      if (number && number.trim() !== room.number) {
        const dup = await prisma.room.findFirst({
          where: { locationId, number: number.trim(), id: { not: roomId } },
        });
        if (dup) return res.status(409).json({ error: "Room number already exists" });
      }

      const updated = await prisma.room.update({
        where: { id: roomId },
        data: {
          ...(number && { number: number.trim() }),
          ...(status && { status }),
          ...(pricePerNight !== undefined && {
            pricePerNight: pricePerNight !== null ? Number(pricePerNight) : null,
          }),
          ...(pricePerMonth !== undefined && {
            pricePerMonth: pricePerMonth !== null ? Number(pricePerMonth) : null,
          }),
          ...(notes !== undefined && { notes: notes || null }),
        },
      });
      return res.status(200).json({ room: updated });
    }

    case "DELETE": {
      if (room.status === "occupied") {
        return res.status(400).json({ error: "Cannot delete an occupied room" });
      }
      await prisma.room.delete({ where: { id: roomId } });
      return res.status(200).json({ success: true });
    }

    default:
      return res.status(405).json({ error: "Method Not Allowed" });
  }
}
