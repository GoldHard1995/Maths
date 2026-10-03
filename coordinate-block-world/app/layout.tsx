import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: '坐標方塊世界',
  description: '在雪地方塊世界練習坐標、距離、面積及變換。九個適合橫向平板的小遊戲。',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-HK"><body>{children}</body></html>;
}
