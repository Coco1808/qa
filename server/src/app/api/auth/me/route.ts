import { fail, ok, readUser } from "@/lib/http";

export async function GET(req: Request) {
  const user = await readUser(req);
  if (!user) return fail("请先登录", 401);
  return ok(user);
}
