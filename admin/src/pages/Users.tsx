import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { App, Button, Form, Input, Modal, Select, Space, Table, Tag } from "antd";
import dayjs from "dayjs";
import { api, getUser } from "../api";
import type { AccountItem, Role } from "../types";

export default function Users() {
  const current = getUser();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<AccountItem[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AccountItem | null>(null);
  const [resetting, setResetting] = useState<AccountItem | null>(null);
  const [form] = Form.useForm<{ username: string; password: string; displayName: string; role: Role }>();
  const [passwordForm] = Form.useForm<{ password: string }>();

  async function load() {
    setLoading(true);
    try {
      setUsers(await api<AccountItem[]>("/api/users"));
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (current?.role === "admin") void load();
  }, []);

  if (current?.role !== "admin") return <Navigate to="/" replace />;

  return (
    <div>
      <div className="page-heading">
        <div>
          <h2>账号管理</h2>
          <p>只有启用中的后台账号可以登录并查看反馈。</p>
        </div>
        <Button
          type="primary"
          onClick={() => {
            setEditing(null);
            form.resetFields();
            form.setFieldsValue({ role: "staff" });
            setOpen(true);
          }}
        >
          新建账号
        </Button>
      </div>
      <Table
        rowKey="id"
        loading={loading}
        scroll={{ x: 760 }}
        dataSource={users}
        pagination={false}
        columns={[
          { title: "姓名", dataIndex: "display_name" },
          { title: "账号", dataIndex: "username" },
          {
            title: "角色",
            dataIndex: "role",
            render: (value: Role) => (value === "admin" ? "管理员" : "值班人员"),
          },
          {
            title: "状态",
            dataIndex: "status",
            render: (value: number) => (value === 1 ? <Tag color="green">启用</Tag> : <Tag>停用</Tag>),
          },
          {
            title: "创建时间",
            dataIndex: "created_at",
            render: (value: string) => dayjs(value).format("YYYY-MM-DD HH:mm"),
          },
          {
            title: "操作",
            render: (_, record) => (
              <Space>
                <Button
                  type="link"
                  onClick={() => {
                    setEditing(record);
                    form.setFieldsValue({
                      username: record.username,
                      displayName: record.display_name,
                      role: record.role,
                      password: "",
                    });
                    setOpen(true);
                  }}
                >
                  编辑
                </Button>
                <Button type="link" onClick={() => setResetting(record)}>
                  重置密码
                </Button>
                <Button
                  type="link"
                  onClick={async () => {
                    try {
                      await api(`/api/users/${record.id}`, {
                        method: "PATCH",
                        body: JSON.stringify({ status: record.status === 1 ? 0 : 1 }),
                      });
                      message.success(record.status === 1 ? "已停用" : "已启用");
                      await load();
                    } catch (error) {
                      message.error(error instanceof Error ? error.message : "操作失败");
                    }
                  }}
                >
                  {record.status === 1 ? "停用" : "启用"}
                </Button>
              </Space>
            ),
          },
        ]}
      />
      <Modal
        title={editing ? "编辑账号" : "新建账号"}
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
                await api(`/api/users/${editing.id}`, {
                  method: "PATCH",
                  body: JSON.stringify({ displayName: values.displayName, role: values.role }),
                });
              } else {
                await api("/api/users", { method: "POST", body: JSON.stringify(values) });
              }
              message.success("已保存");
              setOpen(false);
              await load();
            } catch (error) {
              message.error(error instanceof Error ? error.message : "保存失败");
            }
          }}
        >
          <Form.Item label="姓名" name="displayName" rules={[{ required: true, message: "请填写姓名" }]}>
            <Input maxLength={50} />
          </Form.Item>
          <Form.Item
            label="账号"
            name="username"
            rules={[{ required: true, pattern: /^[a-zA-Z0-9_]{3,32}$/, message: "3-32 位字母、数字或下划线" }]}
          >
            <Input disabled={!!editing} />
          </Form.Item>
          {!editing && (
            <Form.Item label="密码" name="password" rules={[{ required: true, min: 6, message: "密码至少 6 位" }]}>
              <Input.Password />
            </Form.Item>
          )}
          <Form.Item label="角色" name="role" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "staff", label: "值班人员" },
                { value: "admin", label: "管理员" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={`重置密码：${resetting?.username || ""}`}
        open={!!resetting}
        onCancel={() => setResetting(null)}
        onOk={() => passwordForm.submit()}
        destroyOnClose
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={async (values) => {
            if (!resetting) return;
            try {
              await api(`/api/users/${resetting.id}`, {
                method: "PATCH",
                body: JSON.stringify(values),
              });
              message.success("密码已重置");
              setResetting(null);
              passwordForm.resetFields();
            } catch (error) {
              message.error(error instanceof Error ? error.message : "重置失败");
            }
          }}
        >
          <Form.Item label="新密码" name="password" rules={[{ required: true, min: 6, message: "密码至少 6 位" }]}>
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
