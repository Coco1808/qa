import bcrypt from "bcryptjs";
import fs from "fs";
import mysql from "mysql2/promise";

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3307),
  user: process.env.DB_USER || "qa",
  password: process.env.DB_PASSWORD || "qa_pass_123",
  database: process.env.DB_NAME || "qa_feedback",
  multipleStatements: true,
});

const schema = fs.readFileSync(new URL("../sql/schema.sql", import.meta.url), "utf8");
await connection.query(schema);

const [users] = await connection.query("SELECT id FROM users LIMIT 1");
if (users.length === 0) {
  const adminHash = await bcrypt.hash("Admin@123", 10);
  const staffHash = await bcrypt.hash("Staff@123", 10);
  await connection.query(
    `INSERT INTO users (username, password_hash, display_name, role)
     VALUES (?, ?, ?, ?), (?, ?, ?, ?)`,
    ["admin", adminHash, "系统管理员", "admin", "staff", staffHash, "值班人员", "staff"],
  );

  await connection.query(
    `INSERT INTO feedbacks (reporter_name, reporter_phone, reporter_address, category, content, status)
     VALUES (?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?)`,
    [
      "王芳",
      "13800000000",
      "主楼一层大厅",
      "fault",
      "大厅东侧有一盏灯不亮，晚上比较暗。",
      "pending",
      "刘强",
      "13900000000",
      "主楼一层服务台旁",
      "suggestion",
      "希望服务台旁边能增加一个饮水机。",
      "processing",
    ],
  );
}

const feedbackColumns = [
  ["reporter_name", "VARCHAR(50) NOT NULL DEFAULT ''"],
  ["reporter_phone", "VARCHAR(30) NOT NULL DEFAULT ''"],
  ["reporter_address", "VARCHAR(200) NOT NULL DEFAULT ''"],
];

for (const [name, definition] of feedbackColumns) {
  const [found] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'feedbacks' AND COLUMN_NAME = ?`,
    [name],
  );
  if (Number(found[0].total) === 0) {
    await connection.query(`ALTER TABLE feedbacks ADD COLUMN \`${name}\` ${definition}`);
  }
}

const [contactColumn] = await connection.query(
  `SELECT COUNT(*) AS total
   FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'feedbacks' AND COLUMN_NAME = 'contact'`,
);
if (Number(contactColumn[0].total) > 0) {
  await connection.query(
    "UPDATE feedbacks SET reporter_phone = contact WHERE reporter_phone = '' AND contact <> ''",
  );
}

await connection.query("UPDATE feedbacks SET reporter_name = '未登记' WHERE reporter_name = ''");

const [pointKey] = await connection.query(
  `SELECT CONSTRAINT_NAME
   FROM information_schema.TABLE_CONSTRAINTS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'feedbacks' AND CONSTRAINT_NAME = 'fk_feedback_point'`,
);
if (pointKey.length > 0) {
  await connection.query("ALTER TABLE feedbacks DROP FOREIGN KEY fk_feedback_point");
}

for (const name of ["point_id", "contact"]) {
  const [found] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'feedbacks' AND COLUMN_NAME = ?`,
    [name],
  );
  if (Number(found[0].total) > 0) {
    await connection.query(`ALTER TABLE feedbacks DROP COLUMN \`${name}\``);
  }
}

const personnelColumns = [
  ["gender", "VARCHAR(10) NOT NULL DEFAULT ''"],
  ["id_card", "VARCHAR(18) NOT NULL DEFAULT ''"],
  ["birth_date", "DATE NULL"],
  ["ethnicity", "VARCHAR(30) NOT NULL DEFAULT ''"],
  ["household_address", "VARCHAR(200) NOT NULL DEFAULT ''"],
  ["residence_address", "VARCHAR(200) NOT NULL DEFAULT ''"],
  ["household_no", "VARCHAR(50) NOT NULL DEFAULT ''"],
  ["education", "VARCHAR(30) NOT NULL DEFAULT ''"],
  ["marital_status", "VARCHAR(20) NOT NULL DEFAULT ''"],
  ["health_status", "VARCHAR(50) NOT NULL DEFAULT ''"],
  ["employment_status", "VARCHAR(50) NOT NULL DEFAULT ''"],
  ["work_location", "VARCHAR(200) NOT NULL DEFAULT ''"],
  ["insurance_status", "VARCHAR(100) NOT NULL DEFAULT ''"],
  ["tags", "VARCHAR(255) NOT NULL DEFAULT ''"],
  ["remark", "VARCHAR(500) NOT NULL DEFAULT ''"],
  ["info_date", "DATE NULL"],
  ["collector", "VARCHAR(50) NOT NULL DEFAULT ''"],
  ["avatar", "VARCHAR(255) NOT NULL DEFAULT ''"],
];

for (const [name, definition] of personnelColumns) {
  const [found] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'personnel' AND COLUMN_NAME = ?`,
    [name],
  );
  if (Number(found[0].total) === 0) {
    await connection.query(`ALTER TABLE personnel ADD COLUMN \`${name}\` ${definition}`);
  }
}

for (const name of ["employee_no", "department", "job_title", "email", "office", "intro"]) {
  const [found] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'personnel' AND COLUMN_NAME = ?`,
    [name],
  );
  if (Number(found[0].total) > 0) {
    await connection.query(`ALTER TABLE personnel DROP COLUMN \`${name}\``);
  }
}

const demoPeople = [
  [
    "STAFF001",
    "张敏",
    "女",
    "430102199005124028",
    "1990-05-12",
    "汉族",
    "湖南省长沙市岳麓区示范路 18 号",
    "湖南省长沙市岳麓区服务台宿舍 2 栋",
    "13811112222",
    "H20260018",
    "大专",
    "已婚",
    "健康",
    "就业",
    "主楼一层服务台",
    "职工医保、养老保险",
    "党员",
    "负责一楼咨询和现场协调。",
    "2026-10-05",
    "系统管理员",
  ],
  [
    "STAFF002",
    "李航",
    "男",
    "430102198803086015",
    "1988-03-08",
    "汉族",
    "湖南省长沙市开福区建设路 6 号",
    "湖南省长沙市开福区工程宿舍",
    "13922223333",
    "H20260022",
    "高中",
    "已婚",
    "健康",
    "外出务工",
    "主楼设备间",
    "居民医保、养老保险",
    "退役军人",
    "负责照明、电梯和会议室设备维修。",
    "2026-10-05",
    "系统管理员",
  ],
];

for (const person of demoPeople) {
  const [existing] = await connection.query("SELECT id, id_card FROM personnel WHERE code = ? LIMIT 1", [person[0]]);
  if (existing.length === 0) {
    await connection.query(
      `INSERT INTO personnel
        (code, name, gender, id_card, birth_date, ethnicity, household_address, residence_address, phone,
         household_no, education, marital_status, health_status, employment_status, work_location,
         insurance_status, tags, remark, info_date, collector)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      person,
    );
  } else if (!existing[0].id_card) {
    await connection.query(
      `UPDATE personnel
       SET name = ?, gender = ?, id_card = ?, birth_date = ?, ethnicity = ?, household_address = ?,
           residence_address = ?, phone = ?, household_no = ?, education = ?, marital_status = ?,
           health_status = ?, employment_status = ?, work_location = ?, insurance_status = ?,
           tags = ?, remark = ?, info_date = ?, collector = ?
       WHERE code = ?`,
      [...person.slice(1), person[0]],
    );
  }
}

await connection.end();
console.log("database ready");
