/* eslint-disable @typescript-eslint/no-unused-vars */
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

const isServer = typeof window === "undefined";

export const generateToken = (userId: string, role: string, expiresIn: string = "1h"): string => {
  const token = jwt.sign({ userId, role }, JWT_SECRET, { expiresIn } as jwt.SignOptions);
  if (process.env.NODE_ENV === "development") {
    console.log("Generated Token:", token);
  }
  return token;
};

export const verifyToken = (
  token: string
): { userId: string; role: string } | null => {
  if (!token || token === "null" || token === "undefined") {
    return null;
  }

  if (!isServer) {
    return null;
  }

  try {
    if (typeof jwt === "undefined" || !jwt.verify) {
      console.error("JWT library not properly loaded");
      return null;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      role: string;
    };
    if (process.env.NODE_ENV === "development") {
      console.log("Verified Token:", decoded);
    }
    return decoded;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Token verification error:", error);
    }
    return null;
  }
};

export interface SessionUser {
  id: string;
  username: string;
  name: string;
  role: string;
  createdAt: Date;
  updatedAt: Date | null;
}

export const getSessionServer = async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<SessionUser | null> => {
  const token = req.cookies["session_id"];
  if (process.env.NODE_ENV === "development") {
    console.log("Session ID from cookies:", token);
  }
  if (!token) {
    return null;
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return null;
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
  if (process.env.NODE_ENV === "development") {
    console.log("User from session:", user);
  }
  if (!user) return null;

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

export const getSessionClient = async (): Promise<SessionUser | null> => {
  try {
    const response = await fetch("/api/auth/session", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (response.ok) {
      return await response.json();
    }

    return null;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Error in getSessionClient:", error);
    }
    return null;
  }
};

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};
