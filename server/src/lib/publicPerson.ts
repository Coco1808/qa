import type { RowDataPacket } from "mysql2";
import { pool } from "@/lib/db";
import { splitTags } from "@/lib/person";

export type PublicPerson = {
  code: string;
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
  avatar: string;
};

function text(value: unknown) {
  if (value == null) return "";
  const raw = String(value).trim();
  return /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : raw;
}

export async function findPublicPerson(rawCode: string) {
  const code = decodeURIComponent(rawCode || "")
    .trim()
    .toUpperCase();
  if (!/^[A-Z0-9]{4,32}$/.test(code)) return null;

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT code, name, gender, id_card, birth_date, ethnicity, household_address, residence_address,
            phone, household_no, education, marital_status, health_status, employment_status,
            work_location, insurance_status, tags, remark, info_date, collector, avatar, status
     FROM personnel
     WHERE code = ?
     LIMIT 1`,
    [code],
  );
  const person = rows[0];
  if (!person || Number(person.status) !== 1) return null;

  const result: PublicPerson = {
    code: text(person.code),
    name: text(person.name),
    gender: text(person.gender),
    idCard: text(person.id_card),
    birthDate: text(person.birth_date),
    ethnicity: text(person.ethnicity),
    householdAddress: text(person.household_address),
    residenceAddress: text(person.residence_address),
    phone: text(person.phone),
    householdNo: text(person.household_no),
    education: text(person.education),
    maritalStatus: text(person.marital_status),
    healthStatus: text(person.health_status),
    employmentStatus: text(person.employment_status),
    workLocation: text(person.work_location),
    insuranceStatus: text(person.insurance_status),
    tags: splitTags(person.tags),
    remark: text(person.remark),
    infoDate: text(person.info_date),
    collector: text(person.collector),
    avatar: text(person.avatar),
  };
  return result;
}
