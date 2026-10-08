import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { ok, requireUser } from "@/lib/http";

const statuses = new Set(["pending", "processing", "resolved", "closed"]);

export async function GET(req: Request) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const page = clampInt(searchParams.get("page"), 1, 1, 100000);
  const pageSize = clampInt(searchParams.get("pageSize"), 10, 1, 50);
  const status = searchParams.get("status") || "";
  const keyword = (searchParams.get("keyword") || "").trim().slice(0, 50);

  const where: string[] = [];
  const params: Array<string | number> = [];
  if (statuses.has(status)) {
    where.push("f.status = ?");
    params.push(status);
  }
  if (keyword) {
    where.push("(f.content LIKE ? OR f.reporter_name LIKE ? OR f.reporter_phone LIKE ? OR f.reporter_address LIKE ?)");
    const like = `%${keyword.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
    params.push(like, like, like, like);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [countRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM feedbacks f ${whereSql}`,
    params,
  );
  const [list] = await pool.query<RowDataPacket[]>(
    `SELECT f.id, f.reporter_name, f.reporter_phone, f.reporter_address, f.category, f.content,
            f.status, f.reply, f.created_at, f.updated_at, u.display_name AS handler_name
     FROM feedbacks f
     LEFT JOIN users u ON u.id = f.handler_id
     ${whereSql}
     ORDER BY f.id DESC
     LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
    params,
  );

  return ok({
    list,
    total: Number(countRows[0]?.total || 0),
    page,
    pageSize,
  });
}

function clampInt(value: string | null, fallback: number, min: number, max: number) {
  const number = Number(value);
  if (!Number.isInteger(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}
