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
      const products = await prisma.product.findMany({
        where: { locationId },
        orderBy: { createdAt: "desc" },
      });
      return res.status(200).json({
        products: products.map((p) => ({
          ...p,
          quantity: Number(p.quantity),
        })),
      });
    }

    case "POST": {
      const canManage = await hasLocationAccess(
        session,
        locationId,
        PERMISSIONS.MANAGE_PRODUCTS
      );
      if (!canManage) return res.status(403).json({ error: "Forbidden" });

      const {
        name,
        sku,
        unit,
        price,
        quantity,
        status,
        categoryId,
        supplierId,
        imageUrl,
      } = req.body;

      if (!name || !unit) {
        return res.status(400).json({ error: "name and unit are required" });
      }

      const product = await prisma.product.create({
        data: {
          locationId,
          categoryId: categoryId || null,
          supplierId: supplierId || null,
          name,
          sku: sku || "",
          unit,
          price: price !== undefined ? Number(price) : 0,
          quantity: quantity !== undefined ? BigInt(quantity) : BigInt(0),
          status: status || "available",
          imageUrl: imageUrl || null,
          createdById: session.id,
          createdAt: new Date(),
        },
      });

      return res.status(201).json({
        product: { ...product, quantity: Number(product.quantity) },
      });
    }

    default:
      return res.status(405).json({ error: "Method Not Allowed" });
  }
}
