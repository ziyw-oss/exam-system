import { useEffect } from "react";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // 自动跳转到登录页或仪表盘页
    router.push("/student/dashboard"); // 或者 "/login"
  }, [router]);

  return <p>Redirecting...</p>;
}