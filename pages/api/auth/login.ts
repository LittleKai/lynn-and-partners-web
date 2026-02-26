import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateToken } from "../../../utils/auth";
import Cookies from "cookies";

const prisma = new PrismaClient();

export default async function login(req: NextApiRequest, res: NextApiResponse) {
  const allowedOrigins = [
    "http://localhost:3000",
    process.env.NEXT_PUBLIC_APP_URL,
    req.headers.origin,
  ];
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader(
      "Access-Control-Allow-Origin",
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    );
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!req.body || typeof req.body !== "object") {
    return res.status(400).json({ error: "Invalid request body" });
  }

  const { username, password, rememberMe } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { username } });

    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    if (!user.password) {
      return res
        .status(500)
        .json({ error: "User data corrupted: password missing" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    if (!user.id) {
      return res.status(500).json({ error: "User data corrupted: id missing" });
    }

    const tokenDuration = rememberMe ? "30d" : "1h";
    const cookieMaxAge = rememberMe
      ? 30 * 24 * 60 * 60 * 1000  // 30 days in ms
      : 60 * 60 * 1000;            // 1 hour in ms

    const token = generateToken(user.id, user.role, tokenDuration);

    if (!token) {
      return res
        .status(500)
        .json({ error: "Failed to generate session token" });
    }

    const isSecure =
      req.headers["x-forwarded-proto"] === "https" ||
      process.env.NODE_ENV !== "development";

    const cookies = new Cookies(req, res, { secure: isSecure });
    cookies.set("session_id", token, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "none",
      maxAge: cookieMaxAge,
    });

    res.status(200).json({
      userId: user.id,
      userName: user.name,
      userUsername: user.username,
      userRole: user.role,
      sessionId: token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
