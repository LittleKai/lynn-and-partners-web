import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { getSessionServer } from "@/utils/auth";

const prisma = new PrismaClient();

/** Replicates the same sanitisation used in the upload API */
function safeLocationName(name: string): string {
  return name.trim().replace(/[/\\:*?"<>|]/g, "-") || "general";
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSessionServer(req, res);
  if (!session) return res.status(401).json({ error: "Unauthorized" });
  if (session.role !== "admin" && session.role !== "superadmin")
    return res.status(403).json({ error: "Forbidden" });

  const { id } = req.query;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Invalid id" });
  }

  const location = await prisma.location.findUnique({ where: { id } });
  if (!location) return res.status(404).json({ error: "Location not found" });

  switch (req.method) {
    case "GET": {
      return res.status(200).json({ location });
    }

    case "PUT": {
      const { name, type, currency, description, address } = req.body;

      const updated = await prisma.location.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(type && { type }),
          ...(currency && { currency }),
          ...(description !== undefined && { description }),
          ...(address !== undefined && { address }),
        },
      });

      // If name changed and using Dropbox, rename the folder (best-effort)
      if (
        name &&
        name !== location.name &&
        process.env.UPLOAD_PROVIDER === "dropbox"
      ) {
        try {
          const { getDropboxClient, DROPBOX_FOLDER } = await import(
            "@/utils/dropbox"
          );
          const fromPath = `${DROPBOX_FOLDER}/${safeLocationName(location.name)}`;
          const toPath = `${DROPBOX_FOLDER}/${safeLocationName(name)}`;

          if (fromPath !== toPath) {
            const dbx = getDropboxClient();
            await dbx.filesMoveV2({
              from_path: fromPath,
              to_path: toPath,
              autorename: true,
            });
          }
        } catch {
          // Folder may not exist yet or rename failed — silently ignore
        }
      }

      return res.status(200).json({ location: updated });
    }

    case "DELETE": {
      await prisma.location.delete({ where: { id } });
      return res.status(200).json({ success: true });
    }

    default:
      return res.status(405).json({ error: "Method Not Allowed" });
  }
}
