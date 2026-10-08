import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

const types: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const name = (await ctx.params).name || "";
  const extension = name.split(".").pop() || "";
  if (!/^[a-f0-9]{32}\.(jpg|png|webp|gif)$/.test(name) || !types[extension]) {
    return new NextResponse(null, { status: 404 });
  }

  const bytes = await readFile(path.join(process.cwd(), "data", "avatars", name)).catch(() => null);
  if (!bytes) return new NextResponse(null, { status: 404 });

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": types[extension],
      "Cache-Control": "public, max-age=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
