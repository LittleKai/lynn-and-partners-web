import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { getSessionServer } from "@/utils/auth";
import { hasLocationAccess } from "@/utils/permissions";

const prisma = new PrismaClient();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prismaAny = prisma as any;

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
      const guests = await prismaAny.guest.findMany({
        where: { locationId },
        orderBy: { checkIn: "desc" },
      });
      return res.status(200).json({ guests });
    }

    case "POST": {
      const { customerId, name, roomId, checkIn, checkOut, adults, children, notes, agreedPrice } =
        req.body;
      if (!checkIn) return res.status(400).json({ error: "checkIn is required" });
      if (!roomId) return res.status(400).json({ error: "roomId is required" });

      // Verify room belongs to this location and is available
      const room = await prismaAny.room.findFirst({
        where: { id: roomId, locationId },
      });
      if (!room) return res.status(404).json({ error: "Room not found" });
      if (room.status !== "available") {
        return res.status(400).json({ error: "Room is not available" });
      }

      const guest = await prismaAny.guest.create({
        data: {
          locationId,
          customerId: customerId || null,
          name: name || null,
          roomId,
          roomNumber: room.number,
          checkIn: new Date(checkIn),
          checkOut: checkOut ? new Date(checkOut) : null,
          adults: adults ? Number(adults) : 1,
          children: children ? Number(children) : 0,
          notes: notes || null,
          agreedPrice: agreedPrice !== undefined && agreedPrice !== "" ? Number(agreedPrice) : null,
          status: checkOut ? "checked-out" : "active",
        },
      });

      // Mark room as occupied
      await prismaAny.room.update({
        where: { id: roomId },
        data: { status: "occupied" },
      });

      return res.status(201).json({ guest });
    }

    case "PUT": {
      const { guestId, checkIn, checkOut, status, notes, adults, children, customerId, name, agreedPrice } =
        req.body;
      if (!guestId) return res.status(400).json({ error: "guestId required" });

      const guestRecord = await prismaAny.guest.findUnique({ where: { id: guestId } });
      if (!guestRecord) return res.status(404).json({ error: "Guest not found" });

      const updated = await prismaAny.guest.update({
        where: { id: guestId },
        data: {
          ...(checkIn !== undefined && { checkIn: checkIn ? new Date(checkIn) : undefined }),
          ...(checkOut !== undefined && {
            checkOut: checkOut ? new Date(checkOut) : null,
          }),
          ...(status && { status }),
          ...(notes !== undefined && { notes: notes || null }),
          ...(adults !== undefined && { adults: Number(adults) }),
          ...(children !== undefined && { children: Number(children) }),
          ...(customerId !== undefined && { customerId: customerId || null }),
          ...(name !== undefined && { name: name || null }),
          ...(agreedPrice !== undefined && {
            agreedPrice: agreedPrice !== "" && agreedPrice !== null ? Number(agreedPrice) : null,
          }),
        },
      });

      // If checking out and guest has a room, mark room as available
      if (status === "checked-out" && guestRecord.roomId) {
        await prismaAny.room.update({
          where: { id: guestRecord.roomId },
          data: { status: "available" },
        });
      }

      return res.status(200).json({ guest: updated });
    }

    case "DELETE": {
      const { guestId } = req.query;
      if (!guestId || typeof guestId !== "string") {
        return res.status(400).json({ error: "guestId required" });
      }
      const toDelete = await prismaAny.guest.findUnique({ where: { id: guestId } });
      await prismaAny.guest.delete({ where: { id: guestId } });
      // Reset room to available if the deleted guest was still active
      if (toDelete?.status === "active" && toDelete.roomId) {
        await prismaAny.room.update({
          where: { id: toDelete.roomId },
          data: { status: "available" },
        });
      }
      return res.status(200).json({ success: true });
    }

    default:
      return res.status(405).json({ error: "Method Not Allowed" });
  }
}
