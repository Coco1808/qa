import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { ok, requireUser } from "@/lib/http";

export async function GET(req: Request) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const [statusRows] = await pool.query<RowDataPacket[]>(
    "SELECT status, COUNT(*) AS count FROM feedbacks GROUP BY status",
  );
  const counts = { pending: 0, processing: 0, resolved: 0, closed: 0, total: 0, today: 0 };
  for (const row of statusRows) {
    const key = String(row.status) as "pending" | "processing" | "resolved" | "closed";
    counts[key] = Number(row.count);
    counts.total += Number(row.count);
  }

  const [todayRows] = await pool.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS count FROM feedbacks WHERE created_at >= CURDATE()",
  );
  counts.today = Number(todayRows[0]?.count || 0);

  const [recent] = await pool.query<RowDataPacket[]>(
    `SELECT id, reporter_name, category, content, status, created_at
     FROM feedbacks
     ORDER BY id DESC
     LIMIT 6`,
  );

  return ok({ counts, recent });
}
