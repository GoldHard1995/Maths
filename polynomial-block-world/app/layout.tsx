import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: '多項式方塊世界',
  description: '在雪地方塊世界練習指數律、多項式概念、加減及乘法。七個適合橫向平板的小遊戲。',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-HK"><body>{children}</body></html>;
}
