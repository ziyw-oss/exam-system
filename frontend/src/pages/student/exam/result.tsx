// File: src/pages/student/exam/result.tsx

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";

interface WrongQuestion {
  question_id: number;
  question_text: string;
  student_answer: string;
  correct_answer: string;
  reason: string; // ✅ 新增 GPT 给出的评分解释
  score: number;   // ✅ 新增字段
}

interface KeypointStat {
  name: string;
  correctRate: number;
}

export default function ExamResultPage() {
  const router = useRouter();
  const { sessionId } = router.query;

  const [data, setData] = useState<{
    totalScore: number;
    fullScore: number;
    percent: number;
    questionCount: number;
    totalQuestions: number;
    wrongQuestions: WrongQuestion[];
    keypointStats: Record<string, KeypointStat>;
  } | null>(null);

  const [questionsPerPage, setQuestionsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchResult = async () => {
      const token = localStorage.getItem("token");
      if (!token || !sessionId) return;

      try {
        const res = await axios.get(`/api/student/exam-result?sessionId=${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log("📦 接收到考试结果数据:", res.data);
        setData(res.data);
      } catch (err) {
        console.error("Failed to fetch exam result:", err);
      }
    };

    if (sessionId) fetchResult();
  }, [sessionId]);

  useEffect(() => {
    const updatePageSize = () => {
      if (containerRef.current) {
        const height = containerRef.current.clientHeight;
        const questionHeight = 200;
        const count = Math.floor(height / questionHeight);
        setQuestionsPerPage(Math.max(count, 1));
      }
    };
    updatePageSize();
    window.addEventListener("resize", updatePageSize);
    return () => window.removeEventListener("resize", updatePageSize);
  }, []);

  if (!data) return <div className="p-6">Loading...</div>;

  const totalPages = Math.ceil(data.wrongQuestions.length / questionsPerPage);
  const pagedQuestions = data.wrongQuestions.slice(
    (currentPage - 1) * questionsPerPage,
    currentPage * questionsPerPage
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans text-gray-900">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded shadow space-y-6" ref={containerRef}>
        <div>
          <h3 className="text-xl font-semibold mb-2">📊 Exam Summary</h3>
          <div className="space-y-1 text-base">
            <p>Your Score: <span className="font-semibold">{data.totalScore}</span></p>
            <p>Full Score: <span className="font-semibold">{data.fullScore}</span></p>
            <p>Percentage: <span className="font-semibold">{data.percent.toFixed(1)}%</span></p>
            <p>You have answered: <span className="font-semibold">{data.questionCount}</span></p>
            <p>Questions in Exam: <span className="font-semibold">{data.totalQuestions}</span></p>
          </div>
        </div>

        <div>
          <h4 className="text-lg font-semibold mb-2">📚 Keypoint Accuracy</h4>
          {Object.entries(data.keypointStats).length === 0 ? (
            <p className="text-gray-500">No keypoint stats available.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(data.keypointStats).map(([id, stat]) => (
                <div key={id} className="bg-gray-50 p-3 rounded border-l-4 border-blue-500">
                  <p className="text-base">
                    {stat.name || `Keypoint ${id}`}: Accuracy {stat.correctRate.toFixed(1)}%
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h4 className="text-lg font-semibold mb-2">❌ Incorrect Answers</h4>
          {data.wrongQuestions.length === 0 ? (
            <p className="text-green-600">All answers correct!</p>
          ) : (
            <>
              <ul className="space-y-4">
                {pagedQuestions.map((q) => (
                  <li key={q.question_id} className="bg-red-50 p-4 rounded border border-red-300">
                    <p className="font-medium mb-2">
                      {q.question_text}{" "}
                      <span style={{ color: "red", fontWeight: "bold" }}>[{q.score}]</span>
                    </p>

                    <p className="text-sm text-red-600">
                      Your answer: {q.student_answer || "N/A"}
                      
                    </p>
                    <p className="text-sm text-green-700">Correct answer: {q.correct_answer || "N/A"}</p>
                    {q.reason && (
                    <p className="text-sm text-gray-700 mt-1 italic border-l-4 border-yellow-400 pl-2 bg-yellow-50 rounded">
                      🤖 GPT Reason: {q.reason}
                    </p>
                    )}
                  </li>
                ))}
              </ul>
              <div className="flex justify-between items-center mt-4">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
                >
                  ← Prev
                </button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
                >
                  Next →
                </button>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => router.push("/student/exam/dashboard")}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            ← Back to Dashboard
          </button>

          {data.wrongQuestions.length > 0 && (
            <button
              onClick={() => router.push("/student/exam/review")}
              className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
            >
              🔁 Review Incorrect Answers
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
