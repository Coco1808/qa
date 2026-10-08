import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Avatar, Button, Drawer, Dropdown, Grid, Layout, Menu, Spin } from "antd";
import { DashboardOutlined, IdcardOutlined, LogoutOutlined, MenuOutlined, TeamOutlined } from "@ant-design/icons";
import { api, clearSession, getToken, getUser } from "../api";
import type { SessionUser } from "../types";

const { Header, Sider, Content } = Layout;

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const screens = Grid.useBreakpoint();
  const compact = screens.lg === false;
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(getUser());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      setReady(true);
      return;
    }
    api<SessionUser>("/api/auth/me")
      .then((current) => {
        localStorage.setItem("qa_user", JSON.stringify(current));
        setUser(current);
      })
      .catch(() => {
        clearSession();
        setUser(null);
      })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!compact) setMenuOpen(false);
  }, [compact]);

  if (!getToken()) return <Navigate to="/login" replace />;
  if (!ready) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <Spin size="large" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  const items = [
    { key: "/", icon: <DashboardOutlined />, label: "反馈管理" },
    ...(user.role === "admin"
      ? [
          { key: "/personnel", icon: <IdcardOutlined />, label: "人员信息" },
          { key: "/users", icon: <TeamOutlined />, label: "账号管理" },
        ]
      : []),
  ];

  const menu = (
    <Menu
      theme={compact ? "light" : "dark"}
      mode="inline"
      selectedKeys={[location.pathname]}
      items={items}
      onClick={({ key }) => {
        navigate(key);
        setMenuOpen(false);
      }}
    />
  );

  return (
    <Layout className="admin-shell">
      {!compact && (
        <Sider className="admin-sider" width={232} theme="dark">
          <div className="sider-brand">
            <div className="brand-mark sider-mark">问</div>
            <div>
              <div className="sider-title">问题反馈</div>
              <div className="sider-subtitle">后台管理</div>
            </div>
          </div>
          {menu}
        </Sider>
      )}
      <Layout className="admin-main">
        <Header className="admin-header">
          <div className="admin-header-left">
            {compact && (
              <Button type="text" icon={<MenuOutlined />} aria-label="打开菜单" onClick={() => setMenuOpen(true)} />
            )}
            {compact && <strong>问题反馈</strong>}
          </div>
          <Dropdown
            menu={{
              items: [{ key: "logout", icon: <LogoutOutlined />, label: "退出登录" }],
              onClick: () => {
                clearSession();
                navigate("/login");
              },
            }}
          >
            <div className="admin-user">
              <Avatar style={{ background: "#1677ff", flex: "none" }}>{user.displayName.slice(0, 1)}</Avatar>
              <span className="admin-user-name">{user.displayName}</span>
              <span className="admin-user-role">{user.role === "admin" ? "管理员" : "值班人员"}</span>
            </div>
          </Dropdown>
        </Header>
        <Content className="admin-content">
          <Outlet />
        </Content>
      </Layout>
      <Drawer
        title="问题反馈"
        placement="left"
        width={280}
        open={compact && menuOpen}
        onClose={() => setMenuOpen(false)}
        styles={{ body: { padding: 8 } }}
      >
        {menu}
      </Drawer>
    </Layout>
  );
}
