import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: '百分法方塊世界',
  description: '在花海方塊世界練習百分數、百分變化、盈利與虧蝕及折扣。六個適合橫向平板的小遊戲。',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-HK"><body>{children}</body></html>;
}
