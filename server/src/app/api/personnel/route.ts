import { randomBytes } from "crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { fail, ok, requireUser } from "@/lib/http";
import { personColumns, personnelFilters, personSchema, splitTags, toSqlValue } from "@/lib/person";

const listSql = `SELECT id, code, name, gender, id_card, birth_date, ethnicity, household_address,
  residence_address, phone, household_no, education, marital_status, health_status, employment_status,
  work_location, insurance_status, tags, remark, info_date, collector, avatar, status, created_at, updated_at
  FROM personnel`;

export async function GET(req: Request) {
  const auth = await requireUser(req, "admin");
  if (auth.error) return auth.error;

  const { whereSql, params } = personnelFilters(new URL(req.url).searchParams);
  const [rows] = await pool.query<RowDataPacket[]>(`${listSql} ${whereSql} ORDER BY id DESC`, params);
  return ok(rows.map(presentPerson));
}

export async function POST(req: Request) {
  const auth = await requireUser(req, "admin");
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  const parsed = personSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "参数不正确");

  const entries = Object.entries(personColumns).filter(([key]) => key !== "status");
  const columns = ["code", ...entries.map(([, column]) => column)];
  const person = parsed.data;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = randomBytes(4).toString("hex").toUpperCase();
    const values = [code, ...entries.map(([key]) => toSqlValue(key, person[key as keyof typeof person] as string | string[]))];
    try {
      const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO personnel (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
        values,
      );
      return ok({ id: result.insertId, code }, 201);
    } catch (error) {
      if (!isDuplicate(error)) throw error;
    }
  }
  return fail("生成人员编码失败，请重试", 500);
}

function presentPerson(row: RowDataPacket) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    gender: row.gender,
    id_card: row.id_card,
    birth_date: row.birth_date || "",
    ethnicity: row.ethnicity,
    household_address: row.household_address,
    residence_address: row.residence_address,
    phone: row.phone,
    household_no: row.household_no,
    education: row.education,
    marital_status: row.marital_status,
    health_status: row.health_status,
    employment_status: row.employment_status,
    work_location: row.work_location,
    insurance_status: row.insurance_status,
    tags: splitTags(row.tags),
    remark: row.remark,
    info_date: row.info_date || "",
    collector: row.collector,
    avatar: row.avatar || "",
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function isDuplicate(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ER_DUP_ENTRY";
}
