import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/router";
import axios from "axios";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await axios.post("/api/admin/login", form);
      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
        alert("登录成功 ✅");
        router.push("/admin/dashboard");
      } else {
        setError(res.data.message || "登录失败");
      }
    } catch (err: any) {
      console.error(err);
      setError("登录请求失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full space-y-6">
        <h1 className="text-2xl font-bold text-center">🔐 登录考试系统</h1>
        <p className="text-sm text-center text-gray-500">请输入您的邮箱和密码进行登录</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">邮箱</label>
            <Input
              type="email"
              name="email"
              placeholder="请输入邮箱"
              value={form.email}
              onChange={handleChange}
              required
              className="mt-1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">密码</label>
            <Input
              type="password"
              name="password"
              placeholder="请输入密码"
              value={form.password}
              onChange={handleChange}
              required
              className="mt-1"
            />
          </div>

          {error && <div className="text-red-500 text-sm text-center">{error}</div>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "登录中..." : "登录"}
          </Button>
        </form>

        <p className="text-sm text-center">
          还没有账号？<a href="/admin/register" className="text-blue-600 underline">去注册</a>
        </p>
      </div>
    </div>
  );
}