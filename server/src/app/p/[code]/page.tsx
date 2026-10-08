import { access } from "fs/promises";
import path from "path";
import type { Metadata } from "next";
import { findPublicPerson } from "@/lib/publicPerson";
import styles from "../../open.module.css";

async function visibleAvatar(avatar: string) {
  if (!avatar) return "";
  if (/^https?:\/\//i.test(avatar)) return avatar;
  const name = path.basename(avatar);
  if (!/^[a-f0-9]{32}\.(jpg|png|webp|gif)$/.test(name)) return "";
  try {
    await access(path.join(process.cwd(), "data", "avatars", name));
    return `/avatars/${name}`;
  } catch {
    return "";
  }
}

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ code: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const person = await findPublicPerson(code);
  return { title: person ? person.name : "人员信息" };
}

function show(value: string) {
  return value || "未填写";
}

export default async function PersonPage({ params }: PageProps) {
  const { code } = await params;
  const person = await findPublicPerson(code);

  if (!person) {
    return (
      <main className={styles.page}>
        <section className={styles.card}>
          <p className={styles.error}>人员不存在或已停用</p>
        </section>
      </main>
    );
  }

  const avatar = await visibleAvatar(person.avatar);
  const rows = [
    { label: "身份证号", value: person.idCard },
    { label: "出生日期", value: person.birthDate },
    { label: "户籍地址", value: person.householdAddress },
    { label: "现居住地址", value: person.residenceAddress },
    { label: "联系电话", value: person.phone },
    { label: "家庭户号", value: person.householdNo },
    { label: "文化程度", value: person.education },
    { label: "婚姻状况", value: person.maritalStatus },
    { label: "健康状况", value: person.healthStatus },
    { label: "就业情况", value: person.employmentStatus },
    { label: "务工地点", value: person.workLocation },
    { label: "参保情况", value: person.insuranceStatus },
    { label: "人员类别", value: person.tags.join("、") },
    { label: "备注", value: person.remark },
    { label: "更新日期", value: person.infoDate },
    { label: "采集人", value: person.collector },
  ];

  return (
    <main className={styles.page}>
      <article className={styles.card}>
        <div className={styles.head}>
          {avatar ? (
            <img className={styles.avatar} src={avatar} alt="" />
          ) : (
            <div className={styles.avatar}>{person.name.slice(0, 1)}</div>
          )}
          <div>
            <h1 className={styles.name}>{person.name}</h1>
            <p className={styles.meta}>
              {person.gender || "未填写性别"} · {person.ethnicity || "未填写民族"}
            </p>
          </div>
        </div>
        {person.tags.length > 0 ? (
          <div className={styles.tags}>
            {person.tags.map((tag) => (
              <span className={styles.tag} key={tag}>
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        {rows.map((item) => (
          <div className={styles.row} key={item.label}>
            <span className={styles.rowLabel}>{item.label}</span>
            <span className={styles.value}>{show(item.value)}</span>
          </div>
        ))}
        <p className={styles.note}>人员信息仅供查看</p>
      </article>
    </main>
  );
}
