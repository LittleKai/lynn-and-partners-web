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
      const transactions = await prisma.inventoryTransaction.findMany({
        where: { locationId },
        orderBy: { createdAt: "desc" },
      });
      return res.status(200).json({
        transactions: transactions.map((t) => ({
          ...t,
          quantity: Number(t.quantity),
        })),
      });
    }

    case "POST": {
      const { type } = req.body as { type: "IMPORT" | "EXPORT" };

      const requiredPermission =
        type === "IMPORT" ? PERMISSIONS.IMPORT_STOCK : PERMISSIONS.EXPORT_STOCK;

      const canDo = await hasLocationAccess(
        session,
        locationId,
        requiredPermission
      );
      if (!canDo) return res.status(403).json({ error: "Forbidden" });

      const { productId, quantity, supplierId, unitPrice, totalPrice, notes, imageUrls, fileUrls } =
        req.body;

      if (!productId || !quantity || !type) {
        return res
          .status(400)
          .json({ error: "productId, quantity, and type are required" });
      }

      if (type !== "IMPORT" && type !== "EXPORT") {
        return res.status(400).json({ error: "type must be IMPORT or EXPORT" });
      }

      // Verify product belongs to this location
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });
      if (!product || product.locationId !== locationId) {
        return res.status(404).json({ error: "Product not found" });
      }

      const qty = BigInt(quantity);

      if (type === "EXPORT" && product.quantity < qty) {
        return res
          .status(400)
          .json({ error: "Insufficient stock for export" });
      }

      // Create transaction and update product quantity atomically
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const txData: any = {
        locationId,
        productId,
        supplierId: supplierId || null,
        type,
        quantity: qty,
        unitPrice: unitPrice ? Number(unitPrice) : null,
        totalPrice: totalPrice ? Number(totalPrice) : null,
        notes: notes || null,
        imageUrls: imageUrls || [],
        fileUrls: fileUrls || [],
        createdById: session.id,
        createdAt: new Date(),
      };

      const [transaction] = await prisma.$transaction([
        prisma.inventoryTransaction.create({ data: txData }),
        prisma.product.update({
          where: { id: productId },
          data: {
            quantity:
              type === "IMPORT"
                ? product.quantity + qty
                : product.quantity - qty,
          },
        }),
      ]);

      return res.status(201).json({
        transaction: { ...transaction, quantity: Number(transaction.quantity) },
      });
    }

    default:
      return res.status(405).json({ error: "Method Not Allowed" });
  }
}
