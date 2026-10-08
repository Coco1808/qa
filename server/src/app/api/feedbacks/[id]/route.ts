import type { RowDataPacket } from "mysql2";
import { z } from "zod";
import { pool } from "@/lib/db";
import { fail, ok, parseId, requireUser } from "@/lib/http";

const schema = z
  .object({
    status: z.enum(["pending", "processing", "resolved", "closed"]).optional(),
    reply: z.string().trim().max(1000).optional(),
  })
  .refine((value) => value.status !== undefined || value.reply !== undefined, "没有可更新的内容");

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const id = parseId((await ctx.params).id);
  if (!id) return fail("反馈不存在", 404);

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT f.id, f.reporter_name, f.reporter_phone, f.reporter_address, f.category, f.content,
            f.status, f.reply, f.created_at, f.updated_at, u.display_name AS handler_name
     FROM feedbacks f
     LEFT JOIN users u ON u.id = f.handler_id
     WHERE f.id = ?
     LIMIT 1`,
    [id],
  );
  if (!rows[0]) return fail("反馈不存在", 404);
  return ok(rows[0]);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req);
  if (auth.error || !auth.user) return auth.error;

  const id = parseId((await ctx.params).id);
  if (!id) return fail("反馈不存在", 404);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "参数不正确");

  const [rows] = await pool.query<RowDataPacket[]>("SELECT id FROM feedbacks WHERE id = ? LIMIT 1", [id]);
  if (!rows[0]) return fail("反馈不存在", 404);

  const fields = ["handler_id = ?"];
  const params: Array<string | number | null> = [auth.user.id];
  if (parsed.data.status !== undefined) {
    fields.push("status = ?");
    params.push(parsed.data.status);
  }
  if (parsed.data.reply !== undefined) {
    fields.push("reply = ?");
    params.push(parsed.data.reply);
  }
  params.push(id);
  await pool.query(`UPDATE feedbacks SET ${fields.join(", ")} WHERE id = ?`, params);
  return ok({ id });
}
