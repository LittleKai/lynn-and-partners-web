import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { getSessionServer } from "@/utils/auth";

const prisma = new PrismaClient();

/**
 * GET /api/users/me/locations
 * Returns all locations the logged-in user has access to.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const session = await getSessionServer(req, res);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  try {
    if (session.role === "superadmin") {
      // Superadmin sees all locations
      const locations = await prisma.location.findMany({
        orderBy: { createdAt: "desc" },
      });
      return res.status(200).json({ locations });
    }

    if (session.role === "admin") {
      // Admin sees all locations
      const locations = await prisma.location.findMany({
        orderBy: { createdAt: "desc" },
      });
      return res.status(200).json({ locations });
    }

    // Regular user: get via UserLocationAccess
    const accessList = await prisma.userLocationAccess.findMany({
      where: { userId: session.id },
    });

    const locationIds = accessList.map((a) => a.locationId);
    const locations = await prisma.location.findMany({
      where: { id: { in: locationIds } },
      orderBy: { createdAt: "desc" },
    });

    // Attach permissions to each location
    const locationsWithPermissions = locations.map((loc) => {
      const access = accessList.find((a) => a.locationId === loc.id);
      return {
        ...loc,
        permissions: access?.permissions || [],
      };
    });

    return res.status(200).json({ locations: locationsWithPermissions });
  } catch (error) {
    console.error("Error fetching user locations:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
