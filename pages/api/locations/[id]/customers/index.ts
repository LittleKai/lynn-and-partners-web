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
      const customers = await prisma.customer.findMany({
        where: { locationId },
        orderBy: { name: "asc" },
      });
      return res.status(200).json({ customers });
    }

    case "POST": {
      const { name, phone, email, address, notes } = req.body;
      if (!name) return res.status(400).json({ error: "name is required" });

      const customer = await prisma.customer.create({
        data: {
          locationId,
          name,
          phone: phone || null,
          email: email || null,
          address: address || null,
          notes: notes || null,
        },
      });
      return res.status(201).json({ customer });
    }

    case "PUT": {
      const { customerId, name, phone, email, address, notes } = req.body;
      if (!customerId) return res.status(400).json({ error: "customerId required" });

      const updated = await prisma.customer.update({
        where: { id: customerId },
        data: {
          ...(name && { name }),
          phone: phone ?? null,
          email: email ?? null,
          address: address ?? null,
          notes: notes ?? null,
        },
      });
      return res.status(200).json({ customer: updated });
    }

    case "DELETE": {
      const { customerId } = req.query;
      if (!customerId || typeof customerId !== "string") {
        return res.status(400).json({ error: "customerId required" });
      }
      await prisma.customer.delete({ where: { id: customerId } });
      return res.status(200).json({ success: true });
    }

    default:
      return res.status(405).json({ error: "Method Not Allowed" });
  }
}
