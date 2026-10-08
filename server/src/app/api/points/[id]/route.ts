import type { RowDataPacket } from "mysql2";
import { z } from "zod";
import { pool } from "@/lib/db";
import { fail, ok, parseId, requireUser } from "@/lib/http";

const schema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    location: z.string().trim().max(200).optional(),
    description: z.string().trim().max(500).optional(),
    status: z.union([z.literal(0), z.literal(1)]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "没有可更新的内容");

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req, "admin");
  if (auth.error) return auth.error;

  const id = parseId((await ctx.params).id);
  if (!id) return fail("点位不存在", 404);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "参数不正确");

  const [rows] = await pool.query<RowDataPacket[]>("SELECT id FROM qr_points WHERE id = ? LIMIT 1", [id]);
  if (!rows[0]) return fail("点位不存在", 404);

  const fields: string[] = [];
  const params: Array<string | number> = [];
  if (parsed.data.name !== undefined) {
    fields.push("name = ?");
    params.push(parsed.data.name);
  }
  if (parsed.data.location !== undefined) {
    fields.push("location = ?");
    params.push(parsed.data.location);
  }
  if (parsed.data.description !== undefined) {
    fields.push("description = ?");
    params.push(parsed.data.description);
  }
  if (parsed.data.status !== undefined) {
    fields.push("status = ?");
    params.push(parsed.data.status);
  }
  params.push(id);
  await pool.query(`UPDATE qr_points SET ${fields.join(", ")} WHERE id = ?`, params);
  return ok({ id });
}
