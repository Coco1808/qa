export type Role = "admin" | "staff";

export type SessionUser = {
  id: number;
  username: string;
  displayName: string;
  role: Role;
};

export type FeedbackStatus = "pending" | "processing" | "resolved" | "closed";
export type FeedbackCategory = "suggestion" | "complaint" | "fault" | "other";

export type FeedbackItem = {
  id: number;
  reporter_name: string;
  reporter_phone: string;
  reporter_address: string;
  category: FeedbackCategory;
  content: string;
  status: FeedbackStatus;
  reply: string | null;
  created_at: string;
  updated_at: string;
  handler_name: string | null;
};

export type PointItem = {
  id: number;
  code: string;
  name: string;
  location: string;
  description: string;
  status: number;
  created_at: string;
  feedback_count: number;
};

export type PersonnelItem = {
  id: number;
  code: string;
  name: string;
  gender: string;
  id_card: string;
  birth_date: string;
  ethnicity: string;
  household_address: string;
  residence_address: string;
  phone: string;
  household_no: string;
  education: string;
  marital_status: string;
  health_status: string;
  employment_status: string;
  work_location: string;
  insurance_status: string;
  tags: string[];
  remark: string;
  info_date: string;
  collector: string;
  avatar: string;
  status: number;
  created_at: string;
  updated_at: string;
};

export const personTagOptions = ["党员", "低保", "残疾", "脱贫户", "退役军人", "老年人", "孕产妇"];

export type AccountItem = {
  id: number;
  username: string;
  display_name: string;
  role: Role;
  status: number;
  created_at: string;
};

export type Page<T> = {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type Stats = {
  counts: {
    pending: number;
    processing: number;
    resolved: number;
    closed: number;
    total: number;
    today: number;
  };
  recent: Array<{
    id: number;
    reporter_name: string;
    category: FeedbackCategory;
    content: string;
    status: FeedbackStatus;
    created_at: string;
  }>;
};

export const statusLabel: Record<FeedbackStatus, string> = {
  pending: "待处理",
  processing: "处理中",
  resolved: "已解决",
  closed: "已关闭",
};

export const categoryLabel: Record<FeedbackCategory, string> = {
  suggestion: "建议",
  complaint: "投诉",
  fault: "故障",
  other: "其他",
};

/** 二维码里的站点地址。构建后台前写入公网网址，手机扫码才会打开页面。 */
export const PUBLIC_ORIGIN = (import.meta.env.VITE_PUBLIC_ORIGIN || "http://127.0.0.1:3000").replace(/\/$/, "");

export function avatarSrc(value?: string) {
  if (!value) return "";
  return value;
}

export function feedbackLink() {
  return `${PUBLIC_ORIGIN}/feedback`;
}

export function personLink(code: string) {
  return `${PUBLIC_ORIGIN}/p/${encodeURIComponent(code)}`;
}
