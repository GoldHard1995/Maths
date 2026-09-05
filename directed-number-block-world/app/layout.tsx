import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: '有向數方塊世界',
  description: '在方塊世界練習數線、比較大小、有向數加減法及拆括號。四個適合平板的小遊戲。',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-HK"><body>{children}</body></html>;
}
