import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { fail, ok } from "@/lib/http";

export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const code = decodeURIComponent((await ctx.params).code || "")
    .trim()
    .toUpperCase();
  if (!/^[A-Z0-9]{4,32}$/.test(code)) return fail("反馈点不存在", 404);

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT code, name, location, description, status
     FROM qr_points
     WHERE code = ?
     LIMIT 1`,
    [code],
  );
  const point = rows[0];
  if (!point || Number(point.status) !== 1) return fail("反馈点不存在或已停用", 404);

  return ok({
    code: point.code,
    name: point.name,
    location: point.location,
    description: point.description,
  });
}
