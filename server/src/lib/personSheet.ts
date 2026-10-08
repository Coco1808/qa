import ExcelJS from "exceljs";
import { personSchema } from "./person";

export const sheetColumns = [
  { header: "人员编码", key: "code" },
  { header: "姓名", key: "name" },
  { header: "性别", key: "gender" },
  { header: "身份证号", key: "idCard" },
  { header: "出生日期", key: "birthDate" },
  { header: "民族", key: "ethnicity" },
  { header: "户籍地址", key: "householdAddress" },
  { header: "现居住地址", key: "residenceAddress" },
  { header: "联系电话", key: "phone" },
  { header: "家庭户号", key: "householdNo" },
  { header: "文化程度", key: "education" },
  { header: "婚姻状况", key: "maritalStatus" },
  { header: "健康状况", key: "healthStatus" },
  { header: "就业情况", key: "employmentStatus" },
  { header: "务工地点", key: "workLocation" },
  { header: "参保情况", key: "insuranceStatus" },
  { header: "人员类别", key: "tags" },
  { header: "备注", key: "remark" },
  { header: "更新日期", key: "infoDate" },
  { header: "采集人", key: "collector" },
  { header: "状态", key: "status" },
] as const;

export type SheetRow = {
  code: string;
  status?: 0 | 1;
  person: {
    name: string;
    gender: string;
    idCard: string;
    birthDate: string;
    ethnicity: string;
    householdAddress: string;
    residenceAddress: string;
    phone: string;
    householdNo: string;
    education: string;
    maritalStatus: string;
    healthStatus: string;
    employmentStatus: string;
    workLocation: string;
    insuranceStatus: string;
    tags: string[];
    remark: string;
    infoDate: string;
    collector: string;
  };
};

const dateKeys = new Set(["birthDate", "infoDate"]);

export function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (value instanceof Date) return formatDate(value);
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value.trim();
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text.trim();
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((item) => item.text || "").join("").trim();
    }
    if ("result" in value) return cellText(value.result as ExcelJS.CellValue);
  }
  return String(value).trim();
}

function formatDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeDate(value: string) {
  const text = value.trim().replace(/\//g, "-");
  const matched = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!matched) return text;
  return `${matched[1]}-${matched[2].padStart(2, "0")}-${matched[3].padStart(2, "0")}`;
}

export async function readPersonSheet(bytes: Uint8Array) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(bytes) as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return { error: "Excel 里没有工作表", rows: [] as Array<{ row: number; data?: SheetRow; message?: string }> };

  const header = sheetColumns.map((column, index) => cellText(sheet.getRow(1).getCell(index + 1).value));
  const expected = sheetColumns.map((column) => column.header);
  if (header.some((item, index) => item !== expected[index])) {
    return { error: `表头必须是：${expected.join("、")}`, rows: [] };
  }

  const rows: Array<{ row: number; data?: SheetRow; message?: string }> = [];
  sheet.eachRow((excelRow, rowNumber) => {
    if (rowNumber === 1) return;
    const values = sheetColumns.map((column, index) => {
      const text = cellText(excelRow.getCell(index + 1).value);
      return dateKeys.has(column.key) ? normalizeDate(text) : text;
    });
    if (values.every((item) => item === "")) return;

    const record = Object.fromEntries(sheetColumns.map((column, index) => [column.key, values[index]])) as Record<string, string>;
    const tags = record.tags.split(/[,，、]/).map((item) => item.trim()).filter(Boolean);
    let status: 0 | 1 | undefined;
    if (record.status === "启用" || record.status === "1") status = 1;
    else if (record.status === "停用" || record.status === "0") status = 0;
    else if (record.status) {
      rows.push({ row: rowNumber, message: "状态只能填启用或停用" });
      return;
    }

    const person = {
      name: record.name,
      gender: record.gender,
      idCard: record.idCard,
      birthDate: record.birthDate,
      ethnicity: record.ethnicity,
      householdAddress: record.householdAddress,
      residenceAddress: record.residenceAddress,
      phone: record.phone,
      householdNo: record.householdNo,
      education: record.education,
      maritalStatus: record.maritalStatus,
      healthStatus: record.healthStatus,
      employmentStatus: record.employmentStatus,
      workLocation: record.workLocation,
      insuranceStatus: record.insuranceStatus,
      tags,
      remark: record.remark,
      infoDate: record.infoDate,
      collector: record.collector,
    };
    const parsed = personSchema.safeParse(person);
    if (!parsed.success) {
      rows.push({ row: rowNumber, message: parsed.error.issues[0]?.message || "这一行数据不正确" });
      return;
    }
    if (record.code && !/^[A-Za-z0-9]{4,32}$/.test(record.code)) {
      rows.push({ row: rowNumber, message: "人员编码只能是 4 到 32 位字母或数字" });
      return;
    }
    const { avatar: _avatar, ...fields } = parsed.data;
    rows.push({
      row: rowNumber,
      data: { code: record.code.toUpperCase(), status, person: fields },
    });
  });

  if (rows.length === 0) return { error: "Excel 里没有可导入的数据", rows };
  return { error: "", rows };
}
