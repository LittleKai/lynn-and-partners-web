import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import { getSessionServer, hashPassword } from "@/utils/auth";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSessionServer(req, res);
  if (!session) return res.status(401).json({ error: "Unauthorized" });
  if (session.role !== "superadmin")
    return res.status(403).json({ error: "Forbidden" });

  const { id } = req.query;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Invalid id" });
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || target.role !== "admin") {
    return res.status(404).json({ error: "Admin not found" });
  }

  switch (req.method) {
    case "PUT": {
      const { name, password } = req.body;
      const data: { name?: string; password?: string; updatedAt: Date } = {
        updatedAt: new Date(),
      };
      if (name) data.name = name;
      if (password) data.password = await hashPassword(password);

      const updated = await prisma.user.update({
        where: { id },
        data,
        select: { id: true, username: true, name: true, role: true },
      });
      return res.status(200).json({ admin: updated });
    }

    case "DELETE": {
      await prisma.user.delete({ where: { id } });
      return res.status(200).json({ success: true });
    }

    default:
      return res.status(405).json({ error: "Method Not Allowed" });
  }
}
