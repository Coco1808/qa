import { z } from "zod";

export const personTags = ["党员", "低保", "残疾", "脱贫户", "退役军人", "老年人", "孕产妇"] as const;

const avatarText = z
  .string()
  .trim()
  .max(255)
  .refine((value) => value === "" || /^\/avatars\/[a-f0-9]{32}\.(jpg|png|webp|gif)$/.test(value), "头像地址不正确");

const dateText = z
  .string()
  .trim()
  .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), "日期格式不正确");

export const personSchema = z.object({
  name: z.string().trim().min(1, "请填写姓名").max(50),
  gender: z.enum(["", "男", "女"]).optional().default(""),
  idCard: z
    .string()
    .trim()
    .max(18)
    .optional()
    .default("")
    .refine((value) => value === "" || /^(\d{15}|\d{17}[\dXx])$/.test(value), "身份证号格式不正确"),
  birthDate: dateText.optional().default(""),
  ethnicity: z.string().trim().max(30).optional().default(""),
  householdAddress: z.string().trim().max(200).optional().default(""),
  residenceAddress: z.string().trim().max(200).optional().default(""),
  phone: z.string().trim().max(30).optional().default(""),
  householdNo: z.string().trim().max(50).optional().default(""),
  education: z.string().trim().max(30).optional().default(""),
  maritalStatus: z.string().trim().max(20).optional().default(""),
  healthStatus: z.string().trim().max(50).optional().default(""),
  employmentStatus: z.string().trim().max(50).optional().default(""),
  workLocation: z.string().trim().max(200).optional().default(""),
  insuranceStatus: z.string().trim().max(100).optional().default(""),
  tags: z.array(z.string().trim().min(1).max(20)).max(12).optional().default([]),
  remark: z.string().trim().max(500).optional().default(""),
  infoDate: dateText.optional().default(""),
  collector: z.string().trim().max(50).optional().default(""),
  avatar: avatarText.optional().default(""),
});

export const personPatchSchema = z
  .object({
    name: z.string().trim().min(1, "请填写姓名").max(50).optional(),
    gender: z.enum(["", "男", "女"]).optional(),
    idCard: z
      .string()
      .trim()
      .max(18)
      .refine((value) => value === "" || /^(\d{15}|\d{17}[\dXx])$/.test(value), "身份证号格式不正确")
      .optional(),
    birthDate: dateText.optional(),
    ethnicity: z.string().trim().max(30).optional(),
    householdAddress: z.string().trim().max(200).optional(),
    residenceAddress: z.string().trim().max(200).optional(),
    phone: z.string().trim().max(30).optional(),
    householdNo: z.string().trim().max(50).optional(),
    education: z.string().trim().max(30).optional(),
    maritalStatus: z.string().trim().max(20).optional(),
    healthStatus: z.string().trim().max(50).optional(),
    employmentStatus: z.string().trim().max(50).optional(),
    workLocation: z.string().trim().max(200).optional(),
    insuranceStatus: z.string().trim().max(100).optional(),
    tags: z.array(z.string().trim().min(1).max(20)).max(12).optional(),
    remark: z.string().trim().max(500).optional(),
    infoDate: dateText.optional(),
    collector: z.string().trim().max(50).optional(),
    avatar: avatarText.optional(),
    status: z.union([z.literal(0), z.literal(1)]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "没有可更新的内容");

export const personColumns: Record<string, string> = {
  name: "name",
  gender: "gender",
  idCard: "id_card",
  birthDate: "birth_date",
  ethnicity: "ethnicity",
  householdAddress: "household_address",
  residenceAddress: "residence_address",
  phone: "phone",
  householdNo: "household_no",
  education: "education",
  maritalStatus: "marital_status",
  healthStatus: "health_status",
  employmentStatus: "employment_status",
  workLocation: "work_location",
  insuranceStatus: "insurance_status",
  tags: "tags",
  remark: "remark",
  infoDate: "info_date",
  collector: "collector",
  avatar: "avatar",
  status: "status",
};

export function toSqlValue(key: string, value: string | number | string[]) {
  if (Array.isArray(value)) return value.join(",");
  if ((key === "birthDate" || key === "infoDate") && value === "") return null;
  return value;
}

export function personnelFilters(searchParams: URLSearchParams) {
  const where: string[] = [];
  const params: string[] = [];

  const like = (column: string, raw: string | null) => {
    const text = (raw || "").trim().slice(0, 50);
    if (!text) return;
    where.push(`${column} LIKE ?`);
    params.push(`%${escapeLike(text)}%`);
  };

  like("name", searchParams.get("name"));
  like("gender", searchParams.get("gender"));
  like("id_card", searchParams.get("idCard"));
  like("phone", searchParams.get("phone"));
  like("tags", searchParams.get("tag"));
  like("collector", searchParams.get("collector"));

  const infoDate = (searchParams.get("infoDate") || "").trim().slice(0, 20);
  if (infoDate) {
    where.push("DATE_FORMAT(info_date, '%Y-%m-%d') LIKE ?");
    params.push(`%${escapeLike(infoDate)}%`);
  }

  const status = (searchParams.get("status") || "").trim().slice(0, 10);
  if (status) {
    where.push("CASE status WHEN 1 THEN '启用' ELSE '停用' END LIKE ?");
    params.push(`%${escapeLike(status)}%`);
  }

  return {
    whereSql: where.length ? `WHERE ${where.join(" AND ")}` : "",
    params,
  };
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export function splitTags(value: unknown) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
