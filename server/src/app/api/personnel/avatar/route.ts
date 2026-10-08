import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { fail, ok, requireUser } from "@/lib/http";

const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const maxBytes = 2 * 1024 * 1024;

export async function POST(req: Request) {
  const auth = await requireUser(req, "admin");
  if (auth.error) return auth.error;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail("请选择头像图片");

  const extension = extensions[file.type];
  if (!extension) return fail("只支持 jpg、png、webp、gif");
  if (file.size <= 0 || file.size > maxBytes) return fail("头像不能超过 2MB");

  const name = `${randomBytes(16).toString("hex")}.${extension}`;
  const dir = path.join(process.cwd(), "data", "avatars");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return ok({ avatar: `/avatars/${name}` });
}
