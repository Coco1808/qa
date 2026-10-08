import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { fail, ok, parseId, requireUser } from "@/lib/http";
import { removeAvatar } from "@/lib/avatar";
import { personColumns, personPatchSchema, toSqlValue } from "@/lib/person";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req, "admin");
  if (auth.error) return auth.error;

  const id = parseId((await ctx.params).id);
  if (!id) return fail("人员不存在", 404);

  const body = await req.json().catch(() => null);
  const parsed = personPatchSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "参数不正确");
  if (Object.keys(parsed.data).length === 0) return fail("没有可更新的内容");

  const [rows] = await pool.query<RowDataPacket[]>("SELECT id, avatar FROM personnel WHERE id = ? LIMIT 1", [id]);
  if (!rows[0]) return fail("人员不存在", 404);

  const fields: string[] = [];
  const params: Array<string | number | null> = [];
  for (const [key, column] of Object.entries(personColumns)) {
    const value = parsed.data[key as keyof typeof parsed.data];
    if (value !== undefined) {
      fields.push(`${column} = ?`);
      params.push(toSqlValue(key, value));
    }
  }
  params.push(id);
  await pool.query(`UPDATE personnel SET ${fields.join(", ")} WHERE id = ?`, params);
  if (parsed.data.avatar !== undefined && parsed.data.avatar !== rows[0].avatar) {
    await removeAvatar(String(rows[0].avatar || ""));
  }
  return ok({ id });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req, "admin");
  if (auth.error) return auth.error;

  const id = parseId((await ctx.params).id);
  if (!id) return fail("人员不存在", 404);

  const [rows] = await pool.query<RowDataPacket[]>("SELECT id, avatar FROM personnel WHERE id = ? LIMIT 1", [id]);
  if (!rows[0]) return fail("人员不存在", 404);

  await pool.query("DELETE FROM personnel WHERE id = ?", [id]);
  await removeAvatar(String(rows[0].avatar || ""));
  return ok({ id });
}
