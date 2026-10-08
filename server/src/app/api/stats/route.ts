import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { ok, requireUser } from "@/lib/http";
import { splitTags } from "@/lib/person";

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

  const [categoryRows] = await pool.query<RowDataPacket[]>(
    "SELECT category, COUNT(*) AS count FROM feedbacks GROUP BY category",
  );
  const categories = { suggestion: 0, complaint: 0, fault: 0, other: 0 };
  for (const row of categoryRows) {
    const key = String(row.category) as keyof typeof categories;
    if (key in categories) categories[key] = Number(row.count);
  }

  if (auth.user?.role !== "admin") return ok({ counts, recent, categories });

  const [tagRows] = await pool.query<RowDataPacket[]>("SELECT tags FROM personnel");
  const tagCounts = new Map<string, number>();
  let untagged = 0;
  for (const row of tagRows) {
    const tags = splitTags(row.tags);
    if (!tags.length) {
      untagged += 1;
      continue;
    }
    for (const tag of tags) tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
  }
  const personTags = [...tagCounts.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, "zh"));
  if (untagged) personTags.push({ name: "未分类", value: untagged });

  return ok({ counts, recent, categories, personTags });
}
