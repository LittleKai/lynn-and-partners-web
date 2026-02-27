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
      const guests = await prisma.guest.findMany({
        where: { locationId },
        orderBy: { checkIn: "desc" },
      });
      return res.status(200).json({ guests });
    }

    case "POST": {
      const { customerId, roomNumber, checkIn, checkOut, adults, children, notes } =
        req.body;
      if (!checkIn) return res.status(400).json({ error: "checkIn is required" });

      const guest = await prisma.guest.create({
        data: {
          locationId,
          customerId: customerId || null,
          roomNumber: roomNumber || null,
          checkIn: new Date(checkIn),
          checkOut: checkOut ? new Date(checkOut) : null,
          adults: adults ? Number(adults) : 1,
          children: children ? Number(children) : 0,
          notes: notes || null,
          status: checkOut ? "checked-out" : "active",
        },
      });
      return res.status(201).json({ guest });
    }

    case "PUT": {
      const { guestId, checkOut, status, roomNumber, notes, adults, children } =
        req.body;
      if (!guestId) return res.status(400).json({ error: "guestId required" });

      const updated = await prisma.guest.update({
        where: { id: guestId },
        data: {
          ...(checkOut !== undefined && {
            checkOut: checkOut ? new Date(checkOut) : null,
          }),
          ...(status && { status }),
          ...(roomNumber !== undefined && { roomNumber: roomNumber || null }),
          ...(notes !== undefined && { notes: notes || null }),
          ...(adults !== undefined && { adults: Number(adults) }),
          ...(children !== undefined && { children: Number(children) }),
        },
      });
      return res.status(200).json({ guest: updated });
    }

    case "DELETE": {
      const { guestId } = req.query;
      if (!guestId || typeof guestId !== "string") {
        return res.status(400).json({ error: "guestId required" });
      }
      await prisma.guest.delete({ where: { id: guestId } });
      return res.status(200).json({ success: true });
    }

    default:
      return res.status(405).json({ error: "Method Not Allowed" });
  }
}
