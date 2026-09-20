import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: '面積與體積方塊世界',
  description: '在天空之城練習面積、均勻截面、角柱體體積及總表面面積。',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-HK"><body>{children}</body></html>;
}
