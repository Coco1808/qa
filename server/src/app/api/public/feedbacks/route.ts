import type { ResultSetHeader } from "mysql2";
import { z } from "zod";
import { pool } from "@/lib/db";
import { fail, ok } from "@/lib/http";

const schema = z.object({
  reporterName: z.string().trim().min(1, "请填写反馈人姓名").max(50),
  reporterPhone: z.string().trim().min(5, "请填写联系电话").max(30),
  reporterAddress: z.string().trim().max(200).optional().default(""),
  category: z.enum(["suggestion", "complaint", "fault", "other"]),
  content: z.string().trim().min(2, "请至少填写 2 个字").max(2000, "内容不能超过 2000 字"),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "参数不正确");

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO feedbacks (reporter_name, reporter_phone, reporter_address, category, content)
     VALUES (?, ?, ?, ?, ?)`,
    [
      parsed.data.reporterName,
      parsed.data.reporterPhone,
      parsed.data.reporterAddress,
      parsed.data.category,
      parsed.data.content,
    ],
  );
  return ok({ id: result.insertId }, 201);
}
