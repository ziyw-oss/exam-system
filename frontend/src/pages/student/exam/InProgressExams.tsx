// File: src/pages/student/exam/InProgressExams.tsx

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";

interface InProgressExam {
    sessionId: number;
    examYear: string;
    paperType: string;
    startedAt: string;
  }

interface InProgressExamsProps {
  onBack: () => void;
}

export default function InProgressExams({ onBack }: InProgressExamsProps) {
  const router = useRouter();
  const [inProgressExams, setInProgressExams] = useState<InProgressExam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInProgressExams = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await axios.get("/api/student/in-progress-exams", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setInProgressExams(res.data);
      } catch (err) {
        console.error("Failed to fetch in-progress exams:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInProgressExams();
  }, []);

  const handleResume = (sessionId: number) => {
    router.push(`/student/exam/setup?resume=1&sessionId=${sessionId}&mode=exam`);
  };

  const handleDelete = async (sessionId: number) => {
    if (!confirm("Are you sure you want to delete this unfinished exam?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/student/in-progress-exams?sessionId=${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInProgressExams((prev) => prev.filter((exam) => exam.sessionId !== sessionId));
    } catch (err) {
      console.error("Failed to delete in-progress exam:", err);
      alert("Failed to delete. Please try again.");
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans text-gray-900">
      <div className="max-w-4xl mx-auto">
        <h4 className="text-2xl font-bold mb-6">📋 Unfinished Exams</h4>

        {loading ? (
          <p>Loading...</p>
        ) : inProgressExams.length === 0 ? (
          <p className="text-gray-500">No unfinished exams found.</p>
        ) : (
          <div className="space-y-4">
            {inProgressExams.map((exam) => (
              
              <div
                key={exam.sessionId}
                className="bg-white p-4 rounded shadow flex flex-row items-center justify-between gap-4"
                >
                <div className="text-sm text-gray-700 flex gap-4 items-center">
                    <span className="text-base font-semibold text-black">
                        {exam.examYear} - {exam.paperType}
                    </span>
                    <span className="text-gray-500">|</span>
                    <span className="text-gray-500">Started at: {new Date(exam.startedAt).toLocaleString()}</span>
                    <span className="text-gray-500">
                        <button
                            onClick={() => handleResume(exam.sessionId)}
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        >
                            📌 Resume   
                        </button>
                    </span>
                </div>

              </div>
              
            ))}
          </div>
        )}

        <div className="mt-6">
          <button
            onClick={() => {
              onBack();
              router.push("/student/exam/dashboard");
            }}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
