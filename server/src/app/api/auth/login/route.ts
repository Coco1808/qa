import bcrypt from "bcryptjs";
import type { RowDataPacket } from "mysql2";
import { z } from "zod";
import { pool } from "@/lib/db";
import { fail, ok, signToken, toUser } from "@/lib/http";

const schema = z.object({
  username: z.string().trim().min(1, "请输入账号").max(50),
  password: z.string().min(1, "请输入密码").max(64),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "参数不正确");

  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, username, password_hash, display_name, role, status FROM users WHERE username = ? LIMIT 1",
    [parsed.data.username],
  );
  const row = rows[0];
  if (!row) return fail("账号或密码错误", 401);

  const matched = await bcrypt.compare(parsed.data.password, String(row.password_hash));
  if (!matched) return fail("账号或密码错误", 401);
  if (Number(row.status) !== 1) return fail("账号已停用", 403);

  const user = toUser(row);
  return ok({ token: signToken(user), user });
}
