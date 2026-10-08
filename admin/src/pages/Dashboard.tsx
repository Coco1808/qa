import { useEffect, useState } from "react";
import { App, Card, Statistic, Table, Tag } from "antd";
import dayjs from "dayjs";
import { api } from "../api";
import { categoryLabel, statusLabel, type FeedbackCategory, type FeedbackStatus, type Stats } from "../types";
import Feedbacks from "./Feedbacks";

const statusColor: Record<FeedbackStatus, string> = {
  pending: "gold",
  processing: "blue",
  resolved: "green",
  closed: "default",
};

export default function Dashboard() {
  const { message } = App.useApp();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api<Stats>("/api/stats")
      .then(setStats)
      .catch((error: Error) => message.error(error.message));
  }, []);

  return (
    <div>
      <div className="page-heading">
        <div>
          <h2>反馈管理</h2>
          <p>查看反馈概况，并处理每一条反馈。不再按扫码点位归类。</p>
        </div>
      </div>
      <Card id="overview" className="work-section" title="概览">
      <div className="stat-grid">
        <Card>
          <Statistic title="待处理" value={stats?.counts.pending ?? 0} valueStyle={{ color: "#d48806" }} />
        </Card>
        <Card>
          <Statistic title="今日新增" value={stats?.counts.today ?? 0} />
        </Card>
        <Card>
          <Statistic title="全部反馈" value={stats?.counts.total ?? 0} />
        </Card>
        <Card>
          <Statistic title="处理中" value={stats?.counts.processing ?? 0} />
        </Card>
      </div>
      <div className="section-label">最近反馈</div>
      <Table
          rowKey="id"
          pagination={false}
          scroll={{ x: 680 }}
          dataSource={stats?.recent || []}
          columns={[
            { title: "反馈人", dataIndex: "reporter_name", width: 100 },
            { title: "类型", dataIndex: "category", render: (value: FeedbackCategory) => categoryLabel[value] },
            { title: "内容", dataIndex: "content", ellipsis: true },
            {
              title: "状态",
              dataIndex: "status",
              render: (value: FeedbackStatus) => <Tag color={statusColor[value]}>{statusLabel[value]}</Tag>,
            },
            {
              title: "反馈时间",
              dataIndex: "created_at",
              render: (value: string) => dayjs(value).format("MM-DD HH:mm"),
            },
          ]}
        />
      </Card>
      <Feedbacks />
    </div>
  );
}
