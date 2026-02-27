import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { getSessionServer } from "@/utils/auth";
import { hasLocationAccess, PERMISSIONS } from "@/utils/permissions";

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

  const canView = await hasLocationAccess(session, locationId);
  if (!canView) return res.status(403).json({ error: "Forbidden" });

  switch (req.method) {
    case "GET": {
      const orders = await prisma.saleOrder.findMany({
        where: { locationId },
        orderBy: { createdAt: "desc" },
      });
      return res.status(200).json({ orders });
    }

    case "POST": {
      const canManage = await hasLocationAccess(
        session,
        locationId,
        PERMISSIONS.MANAGE_PRODUCTS
      );
      if (!canManage) return res.status(403).json({ error: "Forbidden" });

      const { customerId, notes, items } = req.body;
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "items are required" });
      }

      // Check stock availability for all items first
      for (const item of items) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });
        if (!product || product.locationId !== locationId) {
          return res
            .status(404)
            .json({ error: `Product ${item.productId} not found` });
        }
        if (Number(product.quantity) < Number(item.quantity)) {
          return res.status(400).json({
            error: `Insufficient stock for ${product.name}`,
          });
        }
      }

      // Build order items with product name snapshot
      const orderItems = await Promise.all(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items.map(async (item: any) => {
          const product = await prisma.product.findUnique({
            where: { id: item.productId },
          });
          const qty = Number(item.quantity);
          const price = Number(item.salePrice);
          return {
            productId: item.productId,
            productName: product.name,
            quantity: qty,
            salePrice: price,
            totalPrice: qty * price,
          };
        })
      );

      const totalAmount = orderItems.reduce(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (s: number, i: any) => s + i.totalPrice,
        0
      );

      const order = await prisma.saleOrder.create({
        data: {
          locationId,
          customerId: customerId || null,
          notes: notes || null,
          totalAmount,
          createdById: session.id,
          createdByName: session.name,
          items: orderItems,
        },
      });

      // Deduct stock for each item
      for (const item of items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { quantity: { decrement: BigInt(item.quantity) } },
        });
      }

      return res.status(201).json({ order });
    }

    case "DELETE": {
      const canManage = await hasLocationAccess(
        session,
        locationId,
        PERMISSIONS.MANAGE_PRODUCTS
      );
      if (!canManage) return res.status(403).json({ error: "Forbidden" });

      const { orderId } = req.query;
      if (!orderId || typeof orderId !== "string") {
        return res.status(400).json({ error: "orderId required" });
      }

      const order = await prisma.saleOrder.findUnique({
        where: { id: orderId },
      });
      if (!order || order.locationId !== locationId) {
        return res.status(404).json({ error: "Order not found" });
      }

      // Restore stock for each item
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const item of order.items as any[]) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { quantity: { increment: BigInt(item.quantity) } },
        });
      }

      await prisma.saleOrder.delete({ where: { id: orderId } });
      return res.status(200).json({ success: true });
    }

    default:
      return res.status(405).json({ error: "Method Not Allowed" });
  }
}
