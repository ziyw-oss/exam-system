import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatToMarkdown } from "@/lib/formatToMarkdown";

interface WrongQuestion {
  question_id: number;
  question_text: string;
  student_answer: string;
  correct_answer: string;
  reason: string; // ✅ 新增 GPT 给出的评分解释
  score: number;   // ✅ 新增字段
  correct_answer_markdown: string; // ✅ GPT整理后的标准答案
  mark?: number; // ✅ 新增字段
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

  const [questionsPerPage, setQuestionsPerPage] = useState(1);
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

  // useEffect(() => {
  //   const updatePageSize = () => {
  //     if (containerRef.current) {
  //       const height = containerRef.current.clientHeight;
  //       const questionHeight = 200;
  //       const count = Math.floor(height / questionHeight);
  //       setQuestionsPerPage(Math.max(count, 1));
  //     }
  //   };
  //   updatePageSize();
  //   window.addEventListener("resize", updatePageSize);
  //   return () => window.removeEventListener("resize", updatePageSize);
  // }, []);

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
          <h3 className="text-xl font-semibold mb-2">Exam Summary</h3>
          <div className="space-y-1 text-base">
            <p>Your Score: <span className="font-semibold">{data.totalScore}</span></p>
            <p>Full Score: <span className="font-semibold">{data.fullScore}</span></p>
            <p>Percentage: <span className="font-semibold">{data.percent.toFixed(1)}%</span></p>
            <p>You have answered: <span className="font-semibold">{data.questionCount}</span></p>
            <p>Questions in Exam: <span className="font-semibold">{data.totalQuestions}</span></p>
          </div>
        </div>

        <div>
          <h4 className="text-lg font-semibold mb-2">Incorrect Answers</h4>
          {data.wrongQuestions.length === 0 ? (
            <p className="text-green-600">All answers correct!</p>
          ) : (
            <>
              <ul className="space-y-4">
                {pagedQuestions.map((q) => (
                  <li
                    key={q.question_id}
                    className="border border-[#cfe2ff] bg-[#e9f5ff] rounded p-4 font-sans text-gray-900"
                  >
                    <p className="font-semibold text-base mb-2 text-gray-800 flex justify-between items-center">
                      <span className="flex items-center gap-2">
                        {q.question_text}
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            q.score === q.mark
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {q.score === q.mark ? "✅" : ""}
                        </span>
                      </span>
                      <span className="font-bold">
                        [<span className="text-red-600">{q.score}</span> / {q.mark ?? "?"}]
                      </span>
                    </p>

                    <p className="text-base text-gray-800 font-normal mt-2">
                      
                      <strong>Your Answer:</strong>
                      <span className="bg-[#e0f2fe] px-2 py-0.5 rounded ml-1">{q.student_answer || "N/A"}</span>
                    </p>

                    {q.correct_answer_markdown ? (
                      <div className="text-base text-gray-800 font-normal mt-4">
                        <div className="flex items-start gap-2">
                          
                          <span className="font-medium text-gray-700">🧠 Try to REMEMBER this answer</span>
                        </div>
                        <div className="prose prose-sm">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {q.correct_answer_markdown}
                          </ReactMarkdown>
                        </div>
                      </div>
                    ) : (
                      <div className="text-base text-gray-800 font-normal mt-4">
                        <div className="flex items-start gap-2">
                          
                          <span className="font-medium text-gray-700">🧠 Try to REMEMBER this answer</span>
                        </div>
                        <pre className="whitespace-pre-wrap text-base text-gray-800 font-normal">
                          {formatToMarkdown(q.correct_answer)}
                        </pre>
                      </div>
                    )}

                    {q.reason && (
                      <p className="text-base text-gray-700 font-normal italic mt-2 border-l-4 border-blue-400 pl-3 bg-blue-50 rounded">
                        <span className="mr-1">➕</span>
                        <b>Marking Reason:</b> {q.reason}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              <div className="flex justify-between items-center mt-4">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded disabled:opacity-50"
                >
                  ← Prev
                </button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded disabled:opacity-50"
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
            className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark"
          >
            ← Back to Dashboard
          </button>

          {data.wrongQuestions.length > 0 && (
            <button
              onClick={() => router.push("/student/exam/review")}
              className="bg-theme-blue text-white px-4 py-2 rounded hover:bg-primary-dark"
            >
              🔁 Review Incorrect Answers
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
