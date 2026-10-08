import { unlink } from "fs/promises";
import path from "path";

const fileName = /^\/avatars\/([a-f0-9]{32}\.(?:jpg|png|webp|gif))$/;

export function avatarPath(url: string) {
  const matched = fileName.exec(String(url || ""));
  if (!matched) return null;
  return path.join(process.cwd(), "data", "avatars", matched[1]);
}

export async function removeAvatar(url: string) {
  const file = avatarPath(url);
  if (!file) return;
  await unlink(file).catch(() => undefined);
}
