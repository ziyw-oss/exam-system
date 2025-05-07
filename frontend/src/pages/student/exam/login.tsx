// File: src/pages/admin/login.tsx

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
        router.push("/student/exam/dashboard");
      } else {
        setError(res.data.message || "Login failed");
      }
    } catch (err: any) {
      console.error("Login request failed:", err);
      setError("Login failed, please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 font-sans text-gray-900">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full space-y-6">
        <h3 className="text-2xl font-bold text-center">🔐 Login to Exam System</h3>
        <p className="text-sm text-center text-gray-500">Please enter your email and password to log in</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Email</label>
            <Input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={handleChange}
              required
              className="mt-1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Password</label>
            <Input
              type="password"
              name="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              required
              className="mt-1"
            />
          </div>

          {error && <div className="text-red-500 text-sm text-center">{error}</div>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </Button>
        </form>

        <p className="text-sm text-center">
          Don't have an account?{" "}
          <a href="/admin/register" className="text-blue-600 underline">
            Register here
          </a>
        </p>
      </div>
    </div>
  );
}