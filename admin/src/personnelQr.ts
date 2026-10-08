import JSZip from "jszip";
import { toCanvas } from "qrcode";
import { personLink, type PersonnelItem } from "./types";

const CARD_WIDTH = 400;
const QR_SIZE = 320;
const PADDING = 28;
const NAME_SIZE = 28;
const NAME_LINE = 38;

function fileName(name: string) {
  const cleaned = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").replace(/[. ]+$/g, "").trim();
  return cleaned || "未命名";
}

function wrapName(ctx: CanvasRenderingContext2D, name: string, maxWidth: number) {
  const lines: string[] = [];
  let current = "";
  for (const char of name.trim() || "未命名") {
    const next = current + char;
    if (current && ctx.measureText(next).width > maxWidth) {
      lines.push(current);
      current = char;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function renderCard(name: string, url: string) {
  const scale = 2;
  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) throw new Error("无法生成二维码");
  measure.font = `600 ${NAME_SIZE}px "Microsoft YaHei", "PingFang SC", sans-serif`;
  const lines = wrapName(measure, name, CARD_WIDTH - PADDING * 2);
  const height = PADDING + QR_SIZE + 16 + lines.length * NAME_LINE + PADDING;

  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法生成二维码");
  ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CARD_WIDTH, height);

  const qr = document.createElement("canvas");
  await toCanvas(qr, url, { width: QR_SIZE, margin: 1, errorCorrectionLevel: "M" });
  ctx.drawImage(qr, (CARD_WIDTH - QR_SIZE) / 2, PADDING);

  ctx.fillStyle = "#111111";
  ctx.font = `600 ${NAME_SIZE}px "Microsoft YaHei", "PingFang SC", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  lines.forEach((line, index) => {
    ctx.fillText(line, CARD_WIDTH / 2, PADDING + QR_SIZE + 16 + NAME_LINE * index + NAME_LINE / 2);
  });

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("无法生成二维码图片");
  return blob;
}

export async function downloadPersonnelQrZip(people: PersonnelItem[]) {
  const counts = new Map<string, number>();
  for (const person of people) {
    const base = fileName(person.name);
    counts.set(base, (counts.get(base) || 0) + 1);
  }

  const zip = new JSZip();
  const used = new Map<string, number>();
  for (const person of people) {
    const base = fileName(person.name);
    const seen = (used.get(base) || 0) + 1;
    used.set(base, seen);
    const filename = (counts.get(base) || 0) > 1 ? `${base}_${person.code}.png` : `${base}.png`;
    zip.file(filename, await renderCard(person.name, personLink(person.code)));
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "人员二维码.zip";
  link.click();
  URL.revokeObjectURL(url);
}
