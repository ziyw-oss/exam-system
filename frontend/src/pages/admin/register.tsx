// File: src/pages/admin/register.tsx

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
      setError("Please fill out all fields");
      return;
    }
    setLoading(true);
    try {
      await axios.post("/api/admin/register", formData);
      alert("Registration successful ✅. Redirecting to login page.");
      router.push("/student/exam/start");
    } catch (err: any) {
      setError(err.response?.data?.message || "Registration failed. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-md space-y-6 font-sans text-gray-800">
        <h1 className="text-2xl font-bold text-center">🧠 Register for the Exam System</h1>
        <p className="text-sm text-center text-gray-500">
          Friendly mode: step-by-step, simplified, visual feedback
        </p>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 shadow-md"
              onClick={() => setStep(2)}
            >Next</button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>

            <button
              className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 shadow-md"
              onClick={handleSubmit}
              disabled={loading}
            >{loading ? "Submitting..." : "Register"}</button>

            <button
              className="text-blue-600 text-sm mt-2 underline"
              onClick={() => setStep(1)}
            >Back</button>
          </div>
        )}

        {error && <p className="text-red-600 text-sm text-center">{error}</p>}

        <p className="text-sm text-center">
          Already have an account? <a href="/admin/login" className="text-blue-600 underline">Log in</a>
        </p>
      </div>
    </div>
  );
}