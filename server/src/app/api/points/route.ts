import { randomBytes } from "crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { z } from "zod";
import { pool } from "@/lib/db";
import { fail, ok, requireUser } from "@/lib/http";

const schema = z.object({
  name: z.string().trim().min(1, "请填写点位名称").max(100),
  location: z.string().trim().max(200).optional().default(""),
  description: z.string().trim().max(500).optional().default(""),
});

export async function GET(req: Request) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT p.id, p.code, p.name, p.location, p.description, p.status, p.created_at,
            0 AS feedback_count
     FROM qr_points p
     ORDER BY p.id DESC`,
  );
  return ok(rows);
}

export async function POST(req: Request) {
  const auth = await requireUser(req, "admin");
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "参数不正确");

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = randomBytes(4).toString("hex").toUpperCase();
    try {
      const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO qr_points (code, name, location, description)
         VALUES (?, ?, ?, ?)`,
        [code, parsed.data.name, parsed.data.location, parsed.data.description],
      );
      return ok({ id: result.insertId, code }, 201);
    } catch (error) {
      if (!isDuplicate(error)) throw error;
    }
  }
  return fail("生成点位编码失败，请重试", 500);
}

function isDuplicate(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ER_DUP_ENTRY";
}
