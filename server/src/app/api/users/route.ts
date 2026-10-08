import bcrypt from "bcryptjs";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { z } from "zod";
import { pool } from "@/lib/db";
import { fail, ok, requireUser } from "@/lib/http";

const createSchema = z.object({
  username: z.string().trim().regex(/^[a-zA-Z0-9_]{3,32}$/, "账号需为 3-32 位字母、数字或下划线"),
  password: z.string().min(6, "密码至少 6 位").max(64),
  displayName: z.string().trim().min(1, "请填写姓名").max(50),
  role: z.enum(["admin", "staff"]),
});

export async function GET(req: Request) {
  const auth = await requireUser(req, "admin");
  if (auth.error) return auth.error;

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, username, display_name, role, status, created_at
     FROM users
     ORDER BY id ASC`,
  );
  return ok(rows);
}

export async function POST(req: Request) {
  const auth = await requireUser(req, "admin");
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "参数不正确");

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  try {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO users (username, password_hash, display_name, role)
       VALUES (?, ?, ?, ?)`,
      [parsed.data.username, passwordHash, parsed.data.displayName, parsed.data.role],
    );
    return ok({ id: result.insertId }, 201);
  } catch (error) {
    if (isDuplicate(error)) return fail("账号已存在", 409);
    throw error;
  }
}

function isDuplicate(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ER_DUP_ENTRY";
}
