import { randomBytes } from "crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { fail, ok, requireUser } from "@/lib/http";
import { personColumns, toSqlValue } from "@/lib/person";
import { readPersonSheet } from "@/lib/personSheet";

const valueKeys = [
  "name",
  "gender",
  "idCard",
  "birthDate",
  "ethnicity",
  "householdAddress",
  "residenceAddress",
  "phone",
  "householdNo",
  "education",
  "maritalStatus",
  "healthStatus",
  "employmentStatus",
  "workLocation",
  "insuranceStatus",
  "tags",
  "remark",
  "infoDate",
  "collector",
] as const;

const maxBytes = 5 * 1024 * 1024;

export async function POST(req: Request) {
  const auth = await requireUser(req, "admin");
  if (auth.error) return auth.error;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail("请选择 Excel 文件");
  if (!file.name.toLowerCase().endsWith(".xlsx")) return fail("只能导入 Excel 文件（.xlsx）");
  if (file.size <= 0 || file.size > maxBytes) return fail("Excel 文件不能超过 5MB");

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) return fail("只能导入 Excel 文件（.xlsx）");

  let parsed: Awaited<ReturnType<typeof readPersonSheet>>;
  try {
    parsed = await readPersonSheet(bytes);
  } catch {
    return fail("无法读取这个 Excel 文件");
  }
  if (parsed.error) return fail(parsed.error);
  if (parsed.rows.length > 2000) return fail("一次最多导入 2000 行");

  let created = 0;
  let updated = 0;
  const failed: Array<{ row: number; message: string }> = [];

  for (const item of parsed.rows) {
    if (!item.data) {
      failed.push({ row: item.row, message: item.message || "这一行数据不正确" });
      continue;
    }
    try {
      const changed = await saveRow(item.data);
      if (changed === "created") created += 1;
      else updated += 1;
    } catch (error) {
      failed.push({ row: item.row, message: error instanceof Error ? error.message : "保存失败" });
    }
  }

  return ok({ created, updated, failed });
}

async function saveRow(row: NonNullable<Awaited<ReturnType<typeof readPersonSheet>>["rows"][number]["data"]>) {
  const values = valueKeys.map((key) => toSqlValue(key, row.person[key]));
  const assignments = valueKeys.map((key) => `${personColumns[key]} = ?`);
  const statusValue = row.status;

  if (row.code) {
    const [existing] = await pool.query<RowDataPacket[]>("SELECT id FROM personnel WHERE code = ? LIMIT 1", [row.code]);
    if (existing[0]) {
      const fields = [...assignments];
      const params: Array<string | number | null> = [...values];
      if (statusValue !== undefined) {
        fields.push("status = ?");
        params.push(statusValue);
      }
      params.push(Number(existing[0].id));
      await pool.query(`UPDATE personnel SET ${fields.join(", ")} WHERE id = ?`, params);
      return "updated" as const;
    }
  }

  const code = row.code || (await createCode());
  const columns = ["code", ...valueKeys.map((key) => personColumns[key])];
  const params: Array<string | number | null> = [code, ...values];
  if (statusValue !== undefined) {
    columns.push("status");
    params.push(statusValue);
  }
  try {
    await pool.query<ResultSetHeader>(
      `INSERT INTO personnel (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
      params,
    );
  } catch (error) {
    if (isDuplicate(error)) throw new Error("人员编码已存在");
    throw error;
  }
  return "created" as const;
}

async function createCode() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = randomBytes(4).toString("hex").toUpperCase();
    const [rows] = await pool.query<RowDataPacket[]>("SELECT id FROM personnel WHERE code = ? LIMIT 1", [code]);
    if (!rows[0]) return code;
  }
  throw new Error("生成人员编码失败");
}

function isDuplicate(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ER_DUP_ENTRY";
}
