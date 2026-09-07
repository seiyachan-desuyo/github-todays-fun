import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GitHub 今日好玩｜每日开源小杂志",
  description: "每天翻开一页，用普通人的语言发现有趣、实用的 GitHub 项目。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
