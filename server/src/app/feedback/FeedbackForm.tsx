"use client";

import { useState, type FormEvent } from "react";
import styles from "../open.module.css";

const categories = [
  { value: "fault", label: "故障" },
  { value: "complaint", label: "投诉" },
  { value: "suggestion", label: "建议" },
  { value: "other", label: "其他" },
] as const;

type Category = (typeof categories)[number]["value"];

export default function FeedbackForm() {
  const [reporterName, setReporterName] = useState("");
  const [reporterPhone, setReporterPhone] = useState("");
  const [reporterAddress, setReporterAddress] = useState("");
  const [category, setCategory] = useState<Category>("fault");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const name = reporterName.trim();
    const phone = reporterPhone.trim();
    const text = content.trim();
    if (!name) {
      setError("请填写反馈人姓名");
      return;
    }
    if (phone.length < 5) {
      setError("请填写联系电话");
      return;
    }
    if (text.length < 2) {
      setError("请至少填写 2 个字");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/public/feedbacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporterName: name,
          reporterPhone: phone,
          reporterAddress: reporterAddress.trim(),
          category,
          content: text,
        }),
      });
      const body = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!response.ok || !body?.ok) {
        setError(body?.message || "提交失败");
        return;
      }
      setDone(true);
    } catch {
      setError("网络异常，请确认页面能访问后再试");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <main className={styles.page}>
        <section className={`${styles.card} ${styles.center}`}>
          <div className={styles.mark}>✓</div>
          <h1 className={styles.title}>反馈已提交</h1>
          <p className={styles.desc}>工作人员会在后台查看并处理。其他用户看不到这条内容。</p>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <form className={styles.card} onSubmit={submit}>
        <label className={styles.label} htmlFor="reporter-name">
          反馈人
        </label>
        <input
          id="reporter-name"
          className={styles.input}
          maxLength={50}
          placeholder="请填写姓名"
          value={reporterName}
          onChange={(event) => setReporterName(event.target.value)}
        />

        <label className={styles.label} htmlFor="reporter-phone">
          联系电话
        </label>
        <input
          id="reporter-phone"
          className={styles.input}
          type="tel"
          maxLength={30}
          placeholder="请填写手机号"
          value={reporterPhone}
          onChange={(event) => setReporterPhone(event.target.value)}
        />

        <label className={styles.label} htmlFor="reporter-address">
          联系地址（选填）
        </label>
        <input
          id="reporter-address"
          className={styles.input}
          maxLength={200}
          placeholder="方便上门处理时填写"
          value={reporterAddress}
          onChange={(event) => setReporterAddress(event.target.value)}
        />

        <span className={styles.label}>问题类型</span>
        <div className={styles.chips}>
          {categories.map((item) => (
            <button
              key={item.value}
              type="button"
              className={category === item.value ? `${styles.chip} ${styles.chipActive}` : styles.chip}
              onClick={() => setCategory(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <label className={styles.label} htmlFor="feedback-content">
          反馈内容
        </label>
        <textarea
          id="feedback-content"
          className={styles.textarea}
          maxLength={2000}
          placeholder="请描述具体问题"
          value={content}
          onChange={(event) => setContent(event.target.value)}
        />

        {error ? <p className={styles.error}>{error}</p> : null}
        <button className={styles.primary} type="submit" disabled={submitting}>
          {submitting ? "提交中…" : "提交反馈"}
        </button>
        <p className={styles.note}>提交后仅后台指定人员可见。反馈时间由系统自动记录。</p>
      </form>
    </main>
  );
}
