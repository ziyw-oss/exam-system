// File: src/pages/student/exam/review.tsx

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";

interface Question {
  question_id: number;
  question_text: string;
  student_answer: string;
  correct_answer: string;
  gpt_reasoning?: string;
}

export default function ReviewWrongQuestions() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reAnswers, setReAnswers] = useState<Record<number, string>>({});
  const router = useRouter();

  useEffect(() => {
    const fetchWrongQuestions = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please log in first");
        router.push("/login");
        return;
      }

      try {
        const res = await axios.get("/api/student/wrong-questions", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setQuestions(res.data || []);
      } catch (err) {
        console.error("Failed to load incorrect answers:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWrongQuestions();
  }, []);

  const handleAnswerChange = (qid: number, value: string) => {
    setReAnswers((prev) => ({ ...prev, [qid]: value }));
  };

  const current = questions[currentIndex];

  return (
    <div className="p-6 font-sans bg-gray-50 min-h-screen text-gray-800">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded shadow space-y-6">
        <h3 className="text-xl font-bold">🔁 Review Incorrect Answers</h3>

        {loading ? (
          <p>Loading...</p>
        ) : questions.length === 0 ? (
          <p className="text-green-600">🎉 No incorrect answers. Great job!</p>
        ) : (
          <>
            <p className="text-gray-600 text-sm">Question {currentIndex + 1} of {questions.length}</p>

            <div className="border p-4 rounded shadow-sm bg-white">
              <p className="text-lg font-medium leading-relaxed bg-gray-50 p-4 rounded border-l-4 border-blue-500">
                {current.question_text}
              </p>

              <p className="text-sm mt-2 text-red-600">Your Answer: {current.student_answer || "Not answered"}</p>
              <p className="text-sm text-green-700">Correct Answer: {current.correct_answer || "N/A"}</p>

              {current.gpt_reasoning && (
                <p className="text-sm text-blue-700 mt-2">GPT Feedback: {current.gpt_reasoning}</p>
              )}

              <textarea
                className="w-full border border-gray-300 p-4 mt-4 rounded-md shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ width: "100vw", maxWidth: "100%", minHeight: "100px", boxSizing: "border-box" }}
                placeholder="Try again..."
                value={reAnswers[current.question_id] || ""}
                onChange={(e) => handleAnswerChange(current.question_id, e.target.value)}
              />
            </div>

            <div className="flex justify-between mt-4">
              <button
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex(currentIndex - 1)}
                className="bg-gray-300 px-4 py-2 rounded disabled:opacity-50"
              >
                ← Previous
              </button>
              <button
                disabled={currentIndex === questions.length - 1}
                onClick={() => setCurrentIndex(currentIndex + 1)}
                className="bg-gray-300 px-4 py-2 rounded disabled:opacity-50"
              >
                Next →
              </button>
            </div>

            <div className="mt-6 flex justify-center">
              <button
                onClick={() => router.push("/student/exam/dashboard")}
                className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded transition"
              >
                🏠 Back to Dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
