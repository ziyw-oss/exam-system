// 文件路径：frontend/src/pages/_app.tsx
import type { AppProps } from "next/app";
import Head from "next/head";
import "@/styles/globals.css";
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/700.css';
import axios from "axios";
import Router from "next/router";

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      Router.push("/student/exam/login");
    }
    return Promise.reject(error);
  }
);

//console.log("🚀 _app.tsx 正在运行！");

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      
      <div className="font-sans bg-gray-50 min-h-screen text-gray-900">
        <Component {...pageProps} />
      </div>
    </>
  );
}