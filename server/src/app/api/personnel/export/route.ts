import ExcelJS from "exceljs";
import type { RowDataPacket } from "mysql2";
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "@/lib/http";
import { personnelFilters, splitTags } from "@/lib/person";
import { sheetColumns } from "@/lib/personSheet";

export async function GET(req: Request) {
  const auth = await requireUser(req, "admin");
  if (auth.error) return auth.error;

  const { whereSql, params } = personnelFilters(new URL(req.url).searchParams);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT code, name, gender, id_card, birth_date, ethnicity, household_address, residence_address,
            phone, household_no, education, marital_status, health_status, employment_status,
            work_location, insurance_status, tags, remark, info_date, collector, status
     FROM personnel
     ${whereSql}
     ORDER BY id DESC`,
    params,
  );

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("人员信息");
  sheet.columns = sheetColumns.map((column) => ({ header: column.header, key: column.key, width: 18 }));
  sheet.getRow(1).font = { bold: true };
  sheet.autoFilter = { from: "A1", to: "U1" };

  for (const row of rows) {
    sheet.addRow({
      code: row.code,
      name: row.name,
      gender: row.gender,
      idCard: row.id_card,
      birthDate: row.birth_date || "",
      ethnicity: row.ethnicity,
      householdAddress: row.household_address,
      residenceAddress: row.residence_address,
      phone: row.phone,
      householdNo: row.household_no,
      education: row.education,
      maritalStatus: row.marital_status,
      healthStatus: row.health_status,
      employmentStatus: row.employment_status,
      workLocation: row.work_location,
      insuranceStatus: row.insurance_status,
      tags: splitTags(row.tags).join("、"),
      remark: row.remark,
      infoDate: row.info_date || "",
      collector: row.collector,
      status: Number(row.status) === 1 ? "启用" : "停用",
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename*=UTF-8''%E4%BA%BA%E5%91%98%E4%BF%A1%E6%81%AF.xlsx",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
