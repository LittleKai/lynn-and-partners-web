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

  const { id: locationId, expenseId } = req.query;
  if (
    !locationId ||
    typeof locationId !== "string" ||
    !expenseId ||
    typeof expenseId !== "string"
  ) {
    return res.status(400).json({ error: "Invalid params" });
  }

  const canManage = await hasLocationAccess(
    session,
    locationId,
    PERMISSIONS.MANAGE_EXPENSES
  );
  if (!canManage) return res.status(403).json({ error: "Forbidden" });

  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
  });
  if (!expense || expense.locationId !== locationId) {
    return res.status(404).json({ error: "Expense not found" });
  }

  switch (req.method) {
    case "PUT": {
      const { type, amount, description, notes, imageUrls, fileUrls } =
        req.body;

      const updated = await prisma.expense.update({
        where: { id: expenseId },
        data: {
          ...(type && { type }),
          ...(amount !== undefined && { amount: Number(amount) }),
          ...(description !== undefined && { description }),
          ...(notes !== undefined && { notes }),
          ...(imageUrls && { imageUrls }),
          ...(fileUrls && { fileUrls }),
        },
      });
      return res.status(200).json({ expense: updated });
    }

    case "DELETE": {
      await prisma.expense.delete({ where: { id: expenseId } });
      return res.status(200).json({ success: true });
    }

    default:
      return res.status(405).json({ error: "Method Not Allowed" });
  }
}
