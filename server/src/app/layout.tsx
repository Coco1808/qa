export const metadata = {
  title: "人员信息+ 问题反馈",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
