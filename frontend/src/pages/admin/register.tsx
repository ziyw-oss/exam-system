import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";

export default function Register() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
  });
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      setError("请填写所有字段");
      return;
    }
    setLoading(true);
    try {
      await axios.post("/api/admin/register", formData);
      alert("注册成功 ✅，即将跳转登录页面");
      router.push("/student/exam/start");
    } catch (err: any) {
      setError(err.response?.data?.message || "注册失败，请稍后再试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md space-y-6">
        <h1 className="text-2xl font-bold text-center">🧠 欢迎注册考试系统</h1>
        <p className="text-sm text-center text-gray-500">
          友好模式：简洁、分步、可视化反馈
        </p>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium">姓名</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2 mt-1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">邮箱</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2 mt-1"
              />
            </div>

            <button
              className="w-full bg-blue-600 text-white py-2 rounded mt-4 hover:bg-blue-700"
              onClick={() => setStep(2)}
            >下一步</button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium">密码</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2 mt-1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">角色</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2 mt-1"
              >
                <option value="student">学生</option>
                <option value="teacher">教师</option>
              </select>
            </div>

            <button
              className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
              onClick={handleSubmit}
              disabled={loading}
            >{loading ? "正在提交..." : "提交注册"}</button>

            <button
              className="text-blue-600 text-sm mt-2 underline"
              onClick={() => setStep(1)}
            >返回上一步</button>
          </div>
        )}

        {error && <p className="text-red-600 text-sm text-center">{error}</p>}

        <p className="text-sm text-center">
          已有账号？<a href="/admin/login" className="text-blue-600 underline">去登录</a>
        </p>
      </div>
    </div>
  );
}
