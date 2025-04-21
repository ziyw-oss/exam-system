// File: src/pages/student/exam/start.tsx

import { useRouter } from "next/router";
import { useEffect } from "react";

export default function ExamStartPage() {
  const router = useRouter();

  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans text-gray-900 p-4">
      <div className="bg-white shadow-md p-8 rounded-lg w-full max-w-md space-y-6">
        <h1 className="text-xl font-bold text-center">🎯 Start a New Exam</h1>

        <div className="grid gap-4">
          <button
            className="bg-blue-600 text-white py-3 px-4 rounded hover:bg-blue-700 transition"
            onClick={() => router.push("/student/exam/setup?mode=exam")}
          >
            📝 Full Exam Mode
          </button>

          <button
            className="bg-purple-600 text-white py-3 px-4 rounded hover:bg-purple-700 transition"
            onClick={() => router.push("/student/exam/setup?mode=keypoint")}
          >
            📚 Keypoint Practice Mode
          </button>
        </div>
      </div>
    </div>
  );
}