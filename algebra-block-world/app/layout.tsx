import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: '代數方塊世界',
  description: '在方塊世界練習文字代數式、化簡、拆括號、公式代入及數列。七個適合橫向平板的小遊戲。',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-HK"><body>{children}</body></html>;
}
