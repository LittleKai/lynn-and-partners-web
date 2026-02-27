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

  const { id: locationId, productId } = req.query;
  if (
    !locationId ||
    typeof locationId !== "string" ||
    !productId ||
    typeof productId !== "string"
  ) {
    return res.status(400).json({ error: "Invalid params" });
  }

  const canManage = await hasLocationAccess(
    session,
    locationId,
    PERMISSIONS.MANAGE_PRODUCTS
  );
  if (!canManage) return res.status(403).json({ error: "Forbidden" });

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.locationId !== locationId) {
    return res.status(404).json({ error: "Product not found" });
  }

  switch (req.method) {
    case "PUT": {
      const {
        name,
        sku,
        price,
        salePrice,
        quantity,
        status,
        categoryId,
        supplierId,
        imageUrl,
      } = req.body;

      const updated = await prisma.product.update({
        where: { id: productId },
        data: {
          ...(name && { name }),
          ...(sku && { sku }),
          ...(price !== undefined && { price: Number(price) }),
          ...(salePrice !== undefined && { salePrice: Number(salePrice) }),
          ...(quantity !== undefined && { quantity: BigInt(quantity) }),
          ...(status && { status }),
          ...(categoryId && { categoryId }),
          ...(supplierId !== undefined && { supplierId: supplierId || null }),
          ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
        },
      });

      return res.status(200).json({
        product: { ...updated, quantity: Number(updated.quantity) },
      });
    }

    case "DELETE": {
      await prisma.product.delete({ where: { id: productId } });
      return res.status(200).json({ success: true });
    }

    default:
      return res.status(405).json({ error: "Method Not Allowed" });
  }
}
