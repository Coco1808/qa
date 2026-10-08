# 人员信息 + 问题反馈

用户用手机扫描后台给出的二维码，打开一个公网网址，看到固定页面。后台账号登录后才能查看和处理。

- `server`：接口，以及手机扫码后打开的页面
- `admin`：React + Ant Design 后台
- MySQL：Docker 中的 `qa_feedback` 库，映射到本机 `3307` 端口（本机 `3306` 已被占用）

反馈页是 `/feedback`。人员页是 `/p/人员编码`，只展示资料。新增、修改、删除在后台的「人员信息」里完成。

## 本地地址

- 页面和接口：http://127.0.0.1:3000
- 后台：http://127.0.0.1:5173

二维码里的网址来自 `admin/.env.development.local` 的 `VITE_PUBLIC_ORIGIN`。手机要能打开这个地址，页面才会出来。同一 Wi-Fi 可先填电脑的局域网地址；给外网使用时，把服务发布出去，再改成公网地址，例如 `https://feedback.example.com`。改完后重启后台。

## 初始账号

| 角色 | 账号 | 密码 |
| --- | --- | --- |
| 管理员 | admin | Admin@123 |
| 值班人员 | staff | Staff@123 |

演示反馈编码：`DEMO001`、`DEMO002`。演示人员编码：`STAFF001`、`STAFF002`。

管理员可以新建、停用后台账号。停用后该账号不能登录，也就看不到反馈。

## 启动

```bash
docker compose up -d
npm install
npm --prefix server install
npm --prefix admin install
npm run db:init
npm run dev
```

接口会监听 `0.0.0.0:3000`，方便手机访问。若手机打不开，在 Windows 防火墙里放行 3000 端口。
