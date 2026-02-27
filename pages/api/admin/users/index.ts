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
  if (session.role !== "admin" && session.role !== "superadmin")
    return res.status(403).json({ error: "Forbidden" });

  switch (req.method) {
    case "GET": {
      const users = await prisma.user.findMany({
        where: { role: "user" },
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          createdAt: true,
          createdById: true,
        },
        orderBy: { createdAt: "desc" },
      });

      // Resolve creator names
      const creatorIds = [
        ...new Set(users.map((u) => u.createdById).filter(Boolean)),
      ] as string[];
      const creators = await prisma.user.findMany({
        where: { id: { in: creatorIds } },
        select: { id: true, name: true, username: true },
      });
      const creatorMap: Record<string, { name: string; username: string }> = {};
      creators.forEach((c) => { creatorMap[c.id] = { name: c.name, username: c.username }; });

      return res.status(200).json({
        users: users.map((u) => ({
          ...u,
          createdByName: u.createdById ? creatorMap[u.createdById]?.name || null : null,
          createdByUsername: u.createdById ? creatorMap[u.createdById]?.username || null : null,
        })),
      });
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
      const user = await prisma.user.create({
        data: {
          username,
          name,
          password: hashed,
          role: "user",
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
      return res.status(201).json({ user });
    }

    default:
      return res.status(405).json({ error: "Method Not Allowed" });
  }
}
