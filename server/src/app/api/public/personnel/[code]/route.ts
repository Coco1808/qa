import { fail, ok } from "@/lib/http";
import { findPublicPerson } from "@/lib/publicPerson";

export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const person = await findPublicPerson((await ctx.params).code || "");
  if (!person) return fail("人员不存在或已停用", 404);
  return ok(person);
}
