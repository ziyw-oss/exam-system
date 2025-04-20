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
      router.push("/admin/login");
      return;
    }

    try {
      const decoded = jwtDecode<DecodedToken>(token);
      if (decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem("token");
        router.push("/admin/login");
      } else {
        setUser(decoded);
      }
    } catch (err) {
      console.error("Invalid token");
      localStorage.removeItem("token");
      router.push("/admin/login");
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/admin/login");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="bg-white shadow-lg rounded-lg p-8 max-w-lg w-full space-y-4">
        <h1 className="text-2xl font-bold text-center">🎉 欢迎回来，{user.name}</h1>
        <p className="text-center text-sm text-gray-600">
          当前身份：<span className="font-semibold text-blue-600">{user.role === "teacher" ? "教师 👩‍🏫" : "学生 👨‍🎓"}</span>
        </p>

        <div className="grid grid-cols-1 gap-4 mt-6">
          {user.role === "teacher" && (
            <a
              href="/admin/import-exam"
              className="w-full block text-center bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            >📤 导入试卷</a>
          )}

          <a
            href="/admin/question-keypoint-browser"
            className="w-full block text-center bg-purple-600 text-white py-2 rounded hover:bg-purple-700"
          >🔍 知识点浏览</a>

          {user.role === "student" && (
            <a
              href="/practice"
              className="w-full block text-center bg-green-600 text-white py-2 rounded hover:bg-green-700"
            >📝 开始练习</a>
          )}
        </div>

        <button
          onClick={handleLogout}
          className="mt-6 text-sm text-red-600 hover:underline"
        >🚪 退出登录</button>
      </div>
    </div>
  );
}
