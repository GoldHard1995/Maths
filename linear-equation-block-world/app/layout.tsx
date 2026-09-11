import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: '方程方塊世界',
  description: '在方塊世界練習解一元一次方程、建立方程及解答應用題。六個適合橫向平板的小遊戲。',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-HK"><body>{children}</body></html>;
}
