import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: '恆等式方塊世界', description: '在方塊峽谷練習恆等式、平方差及完全平方。六個適合橫向平板的小遊戲。' };
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="zh-HK"><body>{children}</body></html>;}
