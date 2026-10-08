import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import type { RowDataPacket } from "mysql2";
import { pool } from "./db";

const SECRET = process.env.JWT_SECRET || "qa-feedback-dev-secret-2026";

export type Role = "admin" | "staff";

export type AuthUser = {
  id: number;
  username: string;
  displayName: string;
  role: Role;
};

type TokenPayload = {
  uid: number;
  username: string;
  role: Role;
  name: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders });
}

export function ok(data: unknown, status = 200) {
  return json({ ok: true, data }, status);
}

export function fail(message: string, status = 400) {
  return json({ ok: false, message }, status);
}

export function signToken(user: AuthUser) {
  const payload: TokenPayload = {
    uid: user.id,
    username: user.username,
    role: user.role,
    name: user.displayName,
  };
  return jwt.sign(payload, SECRET, { expiresIn: "7d" });
}

export function toUser(row: RowDataPacket): AuthUser {
  return {
    id: Number(row.id),
    username: String(row.username),
    displayName: String(row.display_name),
    role: row.role as Role,
  };
}

export async function readUser(req: Request): Promise<AuthUser | null> {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;

  try {
    const payload = jwt.verify(token, SECRET) as TokenPayload;
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id, username, display_name, role, status FROM users WHERE id = ? LIMIT 1",
      [payload.uid],
    );
    const row = rows[0];
    if (!row || Number(row.status) !== 1) return null;
    return toUser(row);
  } catch {
    return null;
  }
}

export async function requireUser(req: Request, role?: Role) {
  const user = await readUser(req);
  if (!user) return { user: null, error: fail("请先登录", 401) };
  if (role && user.role !== role) return { user: null, error: fail("没有权限", 403) };
  return { user, error: null };
}

export function parseId(value: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}
