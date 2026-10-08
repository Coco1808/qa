import { useCallback, useEffect, useState } from "react";
import { App, Button, Card, Drawer, Form, Input, Modal, Select, Table, Tag, Typography } from "antd";
import { QRCodeSVG } from "qrcode.react";
import dayjs from "dayjs";
import { api } from "../api";
import {
  categoryLabel,
  feedbackLink,
  statusLabel,
  type FeedbackCategory,
  type FeedbackItem,
  type FeedbackStatus,
  type Page,
} from "../types";

const statusColor: Record<FeedbackStatus, string> = {
  pending: "gold",
  processing: "blue",
  resolved: "green",
  closed: "default",
};

export default function Feedbacks() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState<FeedbackStatus>();
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [data, setData] = useState<Page<FeedbackItem>>({ list: [], total: 0, page: 1, pageSize: 10 });
  const [current, setCurrent] = useState<FeedbackItem | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [form] = Form.useForm<{ status: FeedbackStatus; reply: string }>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (status) params.set("status", status);
      if (appliedKeyword) params.set("keyword", appliedKeyword);
      setData(await api<Page<FeedbackItem>>(`/api/feedbacks?${params}`));
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [appliedKeyword, page, pageSize, status]);

  useEffect(() => {
    void load();
  }, [load]);

  function openItem(item: FeedbackItem) {
    setCurrent(item);
    form.setFieldsValue({ status: item.status, reply: item.reply || "" });
  }

  return (
    <Card
      id="feedbacks"
      className="work-section"
      title="反馈列表"
      extra={<Button onClick={() => setQrOpen(true)}>反馈二维码</Button>}
    >
      <p className="section-note">记录反馈人、联系方式和反馈时间。处理时只改状态和回复。</p>
      <div className="filter-bar">
        <Select
          allowClear
          placeholder="全部状态"
          value={status}
          onChange={(value) => {
            setPage(1);
            setStatus(value);
          }}
          options={Object.entries(statusLabel).map(([value, label]) => ({ value, label }))}
        />
        <Input.Search
          allowClear
          placeholder="搜索反馈人、电话、地址、内容"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          onSearch={(value) => {
            setPage(1);
            setAppliedKeyword(value.trim());
          }}
        />
      </div>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={data.list}
        scroll={{ x: 1080 }}
        pagination={{
          current: page,
          pageSize,
          total: data.total,
          showSizeChanger: true,
          onChange: (nextPage, nextSize) => {
            setPage(nextPage);
            setPageSize(nextSize);
          },
        }}
        columns={[
          { title: "反馈人", dataIndex: "reporter_name", width: 100 },
          { title: "联系电话", dataIndex: "reporter_phone", width: 140 },
          { title: "联系地址", dataIndex: "reporter_address", width: 180, ellipsis: true, render: (value: string) => value || "-" },
          { title: "类型", dataIndex: "category", width: 90, render: (value: FeedbackCategory) => categoryLabel[value] },
          { title: "内容", dataIndex: "content", ellipsis: true },
          {
            title: "状态",
            dataIndex: "status",
            width: 100,
            render: (value: FeedbackStatus) => <Tag color={statusColor[value]}>{statusLabel[value]}</Tag>,
          },
          {
            title: "反馈时间",
            dataIndex: "created_at",
            width: 160,
            render: (value: string) => dayjs(value).format("YYYY-MM-DD HH:mm"),
          },
          {
            title: "操作",
            width: 90,
            render: (_, record) => (
              <Button type="link" onClick={() => openItem(record)}>
                处理
              </Button>
            ),
          },
        ]}
      />
      <Drawer
        title="处理反馈"
        width="min(560px, 100vw)"
        open={!!current}
        onClose={() => setCurrent(null)}
        extra={
          <Button
            type="primary"
            loading={saving}
            onClick={() => form.submit()}
          >
            保存
          </Button>
        }
      >
        {current && (
          <>
            <p>
              <strong>{current.reporter_name}</strong>
              <span style={{ color: "#667085" }}> · {current.reporter_phone}</span>
            </p>
            <p style={{ color: "#667085" }}>{current.reporter_address || "未填写联系地址"}</p>
            <p style={{ color: "#667085" }}>反馈时间 {dayjs(current.created_at).format("YYYY-MM-DD HH:mm")}</p>
            <p>
              <Tag>{categoryLabel[current.category]}</Tag>
              <Tag color={statusColor[current.status]}>{statusLabel[current.status]}</Tag>
            </p>
            <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{current.content}</p>
            <p style={{ color: "#667085" }}>{current.handler_name ? `最近处理人 ${current.handler_name}` : "还没有处理人"}</p>
            <Form
              form={form}
              layout="vertical"
              onFinish={async (values) => {
                setSaving(true);
                try {
                  await api(`/api/feedbacks/${current.id}`, {
                    method: "PATCH",
                    body: JSON.stringify(values),
                  });
                  message.success("已保存");
                  setCurrent(null);
                  await load();
                } catch (error) {
                  message.error(error instanceof Error ? error.message : "保存失败");
                } finally {
                  setSaving(false);
                }
              }}
            >
              <Form.Item label="状态" name="status" rules={[{ required: true }]}>
                <Select options={Object.entries(statusLabel).map(([value, label]) => ({ value, label }))} />
              </Form.Item>
              <Form.Item label="回复" name="reply">
                <Input.TextArea rows={4} maxLength={1000} placeholder="记录处理结果，仅后台可见" />
              </Form.Item>
            </Form>
          </>
        )}
      </Drawer>
      <Modal title="反馈二维码" open={qrOpen} footer={null} onCancel={() => setQrOpen(false)}>
        <div className="qr-box">
          <QRCodeSVG value={feedbackLink()} size={196} />
          <Typography.Paragraph copyable style={{ marginBottom: 0 }}>
            {feedbackLink()}
          </Typography.Paragraph>
          <Typography.Text type="secondary">手机扫码后打开这个网址，填写反馈人信息并提交。</Typography.Text>
        </div>
      </Modal>
    </Card>
  );
}
