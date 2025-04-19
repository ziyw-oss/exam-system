import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { jwtDecode } from "jwt-decode";

interface DecodedToken {
  id: number;
  name: string;
  role: string;
  exp: number;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<DecodedToken | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("请先登录");
      router.push("/admin/login");
      return;
    }
    try {
      const decoded: DecodedToken = jwtDecode(token);
      if (decoded.exp * 1000 < Date.now()) {
        alert("登录过期，请重新登录");
        localStorage.removeItem("token");
        router.push("/admin/login");
      } else {
        setUser(decoded);
      }
    } catch (e) {
      console.error("token 解码失败", e);
      router.push("/admin/login");
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/admin/login");
  };

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto mt-20 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">👋 欢迎回来，{user.name}</h1>
        <button
          onClick={handleLogout}
          className="text-sm text-red-600 border border-red-400 rounded px-3 py-1 hover:bg-red-50"
        >
          退出登录
        </button>
      </div>
      <p className="text-center">角色：{user.role === 'teacher' ? '教师' : '学生'}</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
        <a href="/exam/start" className="bg-blue-100 p-4 rounded shadow text-center">📝 开始考试</a>
        <a href="/practice/setup" className="bg-green-100 p-4 rounded shadow text-center">📚 知识点练习</a>
        <a href="/report/latest" className="bg-yellow-100 p-4 rounded shadow text-center">📊 我的报告</a>
        <a href="/settings" className="bg-gray-100 p-4 rounded shadow text-center">⚙️ 设置</a>
      </div>
    </div>
  );
}