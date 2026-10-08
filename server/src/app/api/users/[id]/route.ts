import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";
import { z } from "zod";
import { pool } from "@/lib/db";
import { fail, ok, parseId, requireUser } from "@/lib/http";

const schema = z
  .object({
    displayName: z.string().trim().min(1).max(50).optional(),
    role: z.enum(["admin", "staff"]).optional(),
    status: z.union([z.literal(0), z.literal(1)]).optional(),
    password: z.string().min(6, "密码至少 6 位").max(64).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "没有可更新的内容");

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req, "admin");
  if (auth.error || !auth.user) return auth.error;

  const id = parseId((await ctx.params).id);
  if (!id) return fail("账号不存在", 404);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "参数不正确");

  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, role, status FROM users WHERE id = ? LIMIT 1",
    [id],
  );
  const current = rows[0];
  if (!current) return fail("账号不存在", 404);

  const nextRole = parsed.data.role ?? current.role;
  const nextStatus = parsed.data.status ?? Number(current.status);
  const removesAdmin = current.role === "admin" && (nextRole !== "admin" || nextStatus !== 1);
  if (removesAdmin) {
    const [admins] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND status = 1 AND id <> ?",
      [id],
    );
    if (Number(admins[0]?.count || 0) === 0) return fail("至少保留一个启用中的管理员");
  }

  const fields: string[] = [];
  const params: Array<string | number> = [];
  if (parsed.data.displayName !== undefined) {
    fields.push("display_name = ?");
    params.push(parsed.data.displayName);
  }
  if (parsed.data.role !== undefined) {
    fields.push("role = ?");
    params.push(parsed.data.role);
  }
  if (parsed.data.status !== undefined) {
    fields.push("status = ?");
    params.push(parsed.data.status);
  }
  if (parsed.data.password !== undefined) {
    fields.push("password_hash = ?");
    params.push(await bcrypt.hash(parsed.data.password, 10));
  }

  params.push(id);
  await pool.query(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, params);
  return ok({ id });
}
