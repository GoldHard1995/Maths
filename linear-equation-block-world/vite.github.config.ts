import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Maths/linear-equation/',
  css: { postcss: { plugins: [tailwindcss()] } },
  plugins: [react()],
  resolve: {
    alias: [
      { find: 'next/image', replacement: path.resolve('../github-next-image.tsx') },
      { find: '@', replacement: path.resolve('.') },
    ],
  },
  define: {
    'process.env.NEXT_PUBLIC_PLATFORM_URL': JSON.stringify(''),
    'process.env.NEXT_PUBLIC_LEADERBOARD_URL': JSON.stringify(''),
    'process.env.NEXT_PUBLIC_HUB_URL': JSON.stringify('https://goldhard1995.github.io/Maths/'),
  },
  build: {
    outDir: 'dist-github',
    emptyOutDir: true,
    rolldownOptions: { input: path.resolve('github-game.html') },
  },
});
