import type { Metadata } from "next";
import FeedbackForm from "./FeedbackForm";

export const metadata: Metadata = {
  title: "提交反馈",
};

export default function FeedbackPage() {
  return <FeedbackForm />;
}
