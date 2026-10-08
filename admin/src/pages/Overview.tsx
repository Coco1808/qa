import { useEffect, useMemo, useRef, useState } from "react";
import { App, Card, Statistic, Table, Tag } from "antd";
import { PieChart } from "echarts/charts";
import { GraphicComponent, LegendComponent, TooltipComponent } from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import dayjs from "dayjs";
import { api, getUser } from "../api";
import { categoryLabel, statusLabel, type FeedbackCategory, type FeedbackStatus, type Stats } from "../types";

echarts.use([PieChart, TooltipComponent, LegendComponent, GraphicComponent, CanvasRenderer]);

const statusColor: Record<FeedbackStatus, string> = {
  pending: "gold",
  processing: "blue",
  resolved: "green",
  closed: "default",
};

const statusChartColor: Record<FeedbackStatus, string> = {
  pending: "#d48806",
  processing: "#1677ff",
  resolved: "#52c41a",
  closed: "#8c8c8c",
};

const categoryChartColor: Record<FeedbackCategory, string> = {
  suggestion: "#1677ff",
  complaint: "#fa541c",
  fault: "#722ed1",
  other: "#13c2c2",
};

const tagColors = ["#1677ff", "#13c2c2", "#52c41a", "#faad14", "#fa541c", "#722ed1", "#eb2f96", "#2f54eb"];

type Slice = { name: string; value: number; color?: string };

function PiePanel({ data, donut }: { data: Slice[]; donut?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const payload = JSON.stringify(data);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const slices = (JSON.parse(payload) as Slice[]).filter((item) => item.value > 0);
    const chart = echarts.init(el);
    chart.setOption({
      color: slices.map((item, index) => item.color || tagColors[index % tagColors.length]),
      tooltip: { trigger: "item", formatter: "{b}：{c}（{d}%）" },
      legend: { bottom: 0, type: "scroll" },
      graphic: slices.length
        ? []
        : [
            {
              type: "text",
              left: "center",
              top: "middle",
              style: { text: "暂无数据", fill: "#98a2b3", fontSize: 14 },
            },
          ],
      series: slices.length
        ? [
            {
              type: "pie",
              radius: donut ? ["46%", "70%"] : "68%",
              center: ["50%", "44%"],
              avoidLabelOverlap: true,
              itemStyle: { borderRadius: 6, borderColor: "#fff", borderWidth: 2 },
              label: { formatter: "{b}\n{c}" },
              data: slices.map((item) => ({ name: item.name, value: item.value })),
            },
          ]
        : [],
    });
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(el);
    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [donut, payload]);

  return <div ref={ref} className="chart-box" />;
}

export default function Overview() {
  const { message } = App.useApp();
  const isAdmin = getUser()?.role === "admin";
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api<Stats>("/api/stats")
      .then(setStats)
      .catch((error: Error) => message.error(error.message));
  }, []);

  const statusData = useMemo<Slice[]>(
    () =>
      (Object.keys(statusLabel) as FeedbackStatus[]).map((key) => ({
        name: statusLabel[key],
        value: stats?.counts[key] ?? 0,
        color: statusChartColor[key],
      })),
    [stats],
  );

  const categoryData = useMemo<Slice[]>(
    () =>
      (Object.keys(categoryLabel) as FeedbackCategory[]).map((key) => ({
        name: categoryLabel[key],
        value: stats?.categories[key] ?? 0,
        color: categoryChartColor[key],
      })),
    [stats],
  );

  return (
    <div>
      <div className="page-heading">
        <div>
          <h2>概览</h2>
          <p>{isAdmin ? "查看反馈概况，以及人员类别分布。" : "查看反馈概况。"}</p>
        </div>
      </div>
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
      <div className="chart-grid">
        <Card title="反馈状态">
          <PiePanel data={statusData} donut />
        </Card>
        <Card title="反馈类型">
          <PiePanel data={categoryData} />
        </Card>
        {isAdmin ? (
          <Card className="chart-span" title="人员类别" extra="一人可计入多个类别">
            <PiePanel data={stats?.personTags || []} />
          </Card>
        ) : null}
      </div>
      <Card title="最近反馈">
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
    </div>
  );
}
