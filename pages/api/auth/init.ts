/**
 * POST /api/auth/init
 * One-time endpoint: creates the superadmin if none exists.
 * Disabled after first superadmin is created.
 */
import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // Check if any superadmin already exists
    const existing = await prisma.user.findFirst({
      where: { role: "superadmin" },
    });

    if (existing) {
      return res
        .status(409)
        .json({ error: "Superadmin already exists. Init disabled." });
    }

    const { username, name, password } = req.body;

    if (!username || !name || !password) {
      return res
        .status(400)
        .json({ error: "username, name, and password are required" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        username,
        name,
        password: hashedPassword,
        role: "superadmin",
        createdAt: new Date(),
      },
    });

    return res.status(201).json({
      message: "Superadmin created successfully",
      id: user.id,
      username: user.username,
      role: user.role,
    });
  } catch (error) {
    console.error("Init error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
