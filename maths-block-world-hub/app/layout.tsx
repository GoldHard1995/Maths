import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'中一數學方塊世界',description:'選擇數學課題，完成關卡並收集襟章。'};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="zh-HK"><body>{children}</body></html>}
