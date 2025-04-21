// 文件路径：frontend/src/pages/_app.tsx
import type { AppProps } from "next/app";
import "../styles/globals.css";
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/700.css';

console.log("🚀 _app.tsx 正在运行！");

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <div className="font-sans bg-gray-50 min-h-screen text-gray-900">
      <Component {...pageProps} />
    </div>
  );
}