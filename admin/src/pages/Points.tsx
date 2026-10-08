import { useEffect, useState } from "react";
import { App, Button, Card, Form, Input, Modal, Space, Table, Tag, Typography } from "antd";
import { QRCodeSVG } from "qrcode.react";
import dayjs from "dayjs";
import { api, getUser } from "../api";
import { feedbackLink, type PointItem } from "../types";

export default function Points() {
  const { message } = App.useApp();
  const isAdmin = getUser()?.role === "admin";
  const [loading, setLoading] = useState(false);
  const [points, setPoints] = useState<PointItem[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PointItem | null>(null);
  const [qrPoint, setQrPoint] = useState<PointItem | null>(null);
  const [form] = Form.useForm<{ name: string; location: string; description: string }>();

  async function load() {
    setLoading(true);
    try {
      setPoints(await api<PointItem[]>("/api/points"));
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function toggleStatus(item: PointItem) {
    try {
      await api(`/api/points/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: item.status === 1 ? 0 : 1 }),
      });
      message.success(item.status === 1 ? "已停用" : "已启用");
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "操作失败");
    }
  }

  return (
    <Card
      id="points"
      className="work-section"
      title="扫码点位"
      extra={
        isAdmin ? (
          <Button
            type="primary"
            onClick={() => {
              setEditing(null);
              form.resetFields();
              setOpen(true);
            }}
          >
            新建点位
          </Button>
        ) : null
      }
    >
      <p className="section-note">每个点位生成一个二维码，用户扫码后只能提交反馈，不能查看别人的内容。</p>
      <Table
        rowKey="id"
        loading={loading}
        scroll={{ x: 860 }}
        dataSource={points}
        pagination={{ pageSize: 10 }}
        columns={[
          { title: "名称", dataIndex: "name" },
          { title: "编码", dataIndex: "code" },
          { title: "位置", dataIndex: "location", render: (value: string) => value || "-" },
          { title: "反馈数", dataIndex: "feedback_count", width: 90 },
          {
            title: "状态",
            dataIndex: "status",
            width: 90,
            render: (value: number) => (value === 1 ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>),
          },
          {
            title: "创建时间",
            dataIndex: "created_at",
            width: 170,
            render: (value: string) => dayjs(value).format("YYYY-MM-DD HH:mm"),
          },
          {
            title: "操作",
            width: 220,
            render: (_, record) => (
              <Space>
                <Button type="link" onClick={() => setQrPoint(record)}>
                  二维码
                </Button>
                {isAdmin && (
                  <>
                    <Button
                      type="link"
                      onClick={() => {
                        setEditing(record);
                        form.setFieldsValue(record);
                        setOpen(true);
                      }}
                    >
                      编辑
                    </Button>
                    <Button type="link" onClick={() => toggleStatus(record)}>
                      {record.status === 1 ? "停用" : "启用"}
                    </Button>
                  </>
                )}
              </Space>
            ),
          },
        ]}
      />
      <Modal
        title={editing ? "编辑点位" : "新建点位"}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={async (values) => {
            try {
              if (editing) {
                await api(`/api/points/${editing.id}`, { method: "PATCH", body: JSON.stringify(values) });
              } else {
                await api("/api/points", { method: "POST", body: JSON.stringify(values) });
              }
              message.success("已保存");
              setOpen(false);
              await load();
            } catch (error) {
              message.error(error instanceof Error ? error.message : "保存失败");
            }
          }}
        >
          <Form.Item label="名称" name="name" rules={[{ required: true, message: "请填写名称" }]}>
            <Input maxLength={100} placeholder="例如：一楼服务台" />
          </Form.Item>
          <Form.Item label="位置" name="location">
            <Input maxLength={200} placeholder="例如：主楼一层大厅" />
          </Form.Item>
          <Form.Item label="说明" name="description">
            <Input.TextArea rows={3} maxLength={500} placeholder="告诉用户这里可以反馈什么" />
          </Form.Item>
        </Form>
      </Modal>
      <Modal title="点位二维码" open={!!qrPoint} footer={null} onCancel={() => setQrPoint(null)}>
        {qrPoint && (
          <div className="qr-box">
            <QRCodeSVG value={feedbackLink()} size={196} />
            <div className="qr-code">{qrPoint.code}</div>
            <Typography.Text type="secondary">{qrPoint.name}</Typography.Text>
            <Typography.Paragraph copyable style={{ marginBottom: 0 }}>
              {feedbackLink()}
            </Typography.Paragraph>
            <Typography.Text type="secondary">手机扫码后打开这个网址，填写并提交反馈。</Typography.Text>
          </div>
        )}
      </Modal>
    </Card>
  );
}
