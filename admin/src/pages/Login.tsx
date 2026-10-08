import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { App, Button, Form, Input } from "antd";
import { api, getToken, setSession } from "../api";
import type { SessionUser } from "../types";

export default function Login() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  if (getToken()) return <Navigate to="/" replace />;

  return (
    <div className="login-page">
      <section className="login-hero">
        <div className="brand-mark">问</div>
        <div>
          <h1>人员信息+ 问题反馈</h1>
          <p>让生活便捷，让管理高效</p>
        </div>
        {/* <div>扫码点位 · 反馈处理 · 账号控制</div> */}
      </section>
      <section className="login-panel">
        <div className="login-card">
          <h2>登录后台</h2>
          <div className="hint">使用已开通的工作人员账号</div>
          <Form
            layout="vertical"
            requiredMark={false}
            onFinish={async (values: { username: string; password: string }) => {
              setLoading(true);
              try {
                const data = await api<{ token: string; user: SessionUser }>("/api/auth/login", {
                  method: "POST",
                  body: JSON.stringify(values),
                });
                setSession(data.token, data.user);
                navigate("/");
              } catch (error) {
                message.error(error instanceof Error ? error.message : "登录失败");
              } finally {
                setLoading(false);
              }
            }}
          >
            <Form.Item label="账号" name="username" rules={[{ required: true, message: "请输入账号" }]}>
              <Input size="large" placeholder="请输入账号" autoComplete="username" />
            </Form.Item>
            <Form.Item label="密码" name="password" rules={[{ required: true, message: "请输入密码" }]}>
              <Input.Password size="large" placeholder="请输入密码" autoComplete="current-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={loading}>
              登录
            </Button>
          </Form>
          {/* <div className="account-tip">
            初始管理员 admin / Admin@123
            <br />
            初始值班账号 staff / Staff@123
          </div> */}
        </div>
      </section>
    </div>
  );
}
