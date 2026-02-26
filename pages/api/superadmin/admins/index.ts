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

  switch (req.method) {
    case "GET": {
      const admins = await prisma.user.findMany({
        where: { role: "admin" },
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          createdById: true,
        },
        orderBy: { createdAt: "desc" },
      });
      return res.status(200).json({ admins });
    }

    case "POST": {
      const { username, name, password } = req.body;
      if (!username || !name || !password) {
        return res
          .status(400)
          .json({ error: "username, name, and password are required" });
      }

      const existing = await prisma.user.findUnique({ where: { username } });
      if (existing) {
        return res.status(409).json({ error: "Username already taken" });
      }

      const hashed = await hashPassword(password);
      const admin = await prisma.user.create({
        data: {
          username,
          name,
          password: hashed,
          role: "admin",
          createdById: session.id,
          createdAt: new Date(),
        },
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          createdAt: true,
        },
      });
      return res.status(201).json({ admin });
    }

    default:
      return res.status(405).json({ error: "Method Not Allowed" });
  }
}
