import { PrismaClient } from "@prisma/client";
import { SessionUser } from "./auth";

const prisma = new PrismaClient();

export const PERMISSIONS = {
  MANAGE_PRODUCTS: "MANAGE_PRODUCTS",
  MANAGE_CATEGORIES: "MANAGE_CATEGORIES",
  MANAGE_SUPPLIERS: "MANAGE_SUPPLIERS",
  IMPORT_STOCK: "IMPORT_STOCK",
  EXPORT_STOCK: "EXPORT_STOCK",
  MANAGE_EXPENSES: "MANAGE_EXPENSES",
  VIEW_REPORTS: "VIEW_REPORTS",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Check if the current session user has access to a location with a specific permission.
 * - superadmin: always has access
 * - admin: has access to locations they own
 * - user: must have an explicit UserLocationAccess record with the required permission
 */
export async function hasLocationAccess(
  session: SessionUser,
  locationId: string,
  permission?: Permission
): Promise<boolean> {
  if (session.role === "superadmin") return true;

  if (session.role === "admin") {
    const location = await prisma.location.findUnique({
      where: { id: locationId },
    });
    return location?.adminId === session.id;
  }

  // role === "user"
  const access = await prisma.userLocationAccess.findFirst({
    where: { userId: session.id, locationId },
  });

  if (!access) return false;
  if (!permission) return true;
  return access.permissions.includes(permission);
}
