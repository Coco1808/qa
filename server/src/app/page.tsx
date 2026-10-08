export default function HomePage() {
  return (
    <main style={{ maxWidth: 640, margin: "64px auto", padding: "0 24px", lineHeight: 1.7 }}>
      <h1>问题反馈</h1>
      <p>手机扫码后打开对应网址，即可看到固定页面。管理后台仍在单独地址登录。</p>
      <ul>
        <li>反馈页面：/feedback</li>
        <li>人员页面：/p/人员编码</li>
        <li>管理后台：http://127.0.0.1:5173</li>
      </ul>
    </main>
  );
}
