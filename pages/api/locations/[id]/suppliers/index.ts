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
      const suppliers = await prisma.supplier.findMany({
        where: { locationId },
        orderBy: { name: "asc" },
      });
      return res.status(200).json({ suppliers });
    }

    case "POST": {
      const canManage = await hasLocationAccess(
        session,
        locationId,
        PERMISSIONS.MANAGE_SUPPLIERS
      );
      if (!canManage) return res.status(403).json({ error: "Forbidden" });

      const {
        name,
        contactName,
        phone,
        email,
        address,
        city,
        country,
        taxId,
        businessRegistrationNumber,
        companyName,
        notes,
        paymentTerms,
        contractDate,
      } = req.body;

      if (!name) return res.status(400).json({ error: "name is required" });

      const supplier = await prisma.supplier.create({
        data: {
          locationId,
          name,
          contactName: contactName || null,
          phone: phone || null,
          email: email || null,
          address: address || null,
          city: city || null,
          country: country || null,
          taxId: taxId || null,
          businessRegistrationNumber: businessRegistrationNumber || null,
          companyName: companyName || null,
          notes: notes || null,
          paymentTerms: paymentTerms || null,
          contractDate: contractDate ? new Date(contractDate) : null,
        },
      });
      return res.status(201).json({ supplier });
    }

    case "PUT": {
      const canManage = await hasLocationAccess(
        session,
        locationId,
        PERMISSIONS.MANAGE_SUPPLIERS
      );
      if (!canManage) return res.status(403).json({ error: "Forbidden" });

      const { supplierId, ...updateData } = req.body;
      if (!supplierId)
        return res.status(400).json({ error: "supplierId required" });

      if (updateData.contractDate) {
        updateData.contractDate = new Date(updateData.contractDate);
      }

      const updated = await prisma.supplier.update({
        where: { id: supplierId },
        data: updateData,
      });
      return res.status(200).json({ supplier: updated });
    }

    case "DELETE": {
      const canManage = await hasLocationAccess(
        session,
        locationId,
        PERMISSIONS.MANAGE_SUPPLIERS
      );
      if (!canManage) return res.status(403).json({ error: "Forbidden" });

      const { supplierId } = req.query;
      if (!supplierId || typeof supplierId !== "string")
        return res.status(400).json({ error: "supplierId required" });

      await prisma.supplier.delete({ where: { id: supplierId } });
      return res.status(200).json({ success: true });
    }

    default:
      return res.status(405).json({ error: "Method Not Allowed" });
  }
}
