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
      const expenses = await prisma.expense.findMany({
        where: { locationId },
        orderBy: { createdAt: "desc" },
      });
      return res.status(200).json({ expenses });
    }

    case "POST": {
      const canManage = await hasLocationAccess(
        session,
        locationId,
        PERMISSIONS.MANAGE_EXPENSES
      );
      if (!canManage) return res.status(403).json({ error: "Forbidden" });

      const { type, amount, currency, description, notes, imageUrls, fileUrls } =
        req.body;

      if (!type || amount === undefined) {
        return res.status(400).json({ error: "type and amount are required" });
      }

      const expense = await prisma.expense.create({
        data: {
          locationId,
          type,
          amount: Number(amount),
          currency: currency || "VND",
          description: description || null,
          notes: notes || null,
          imageUrls: imageUrls || [],
          fileUrls: fileUrls || [],
          createdById: session.id,
          createdAt: new Date(),
        },
      });
      return res.status(201).json({ expense });
    }

    default:
      return res.status(405).json({ error: "Method Not Allowed" });
  }
}
