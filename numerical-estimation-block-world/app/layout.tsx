import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: '數值估算方塊世界',
  description: '在沙漠方塊世界練習位值、近似值、有效數字及生活估算。六個適合橫向平板的小遊戲。',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-HK"><body>{children}</body></html>;
}
