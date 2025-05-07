import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { formatToMarkdown } from "@/lib/formatToMarkdown";

function extractCurrentLevelLabel(fullLabel: string): string {
  const matches = fullLabel.match(/\([a-z]+\)|\d+\./gi);
  if (!matches || matches.length === 0) return fullLabel;
  const last = matches[matches.length - 1];
  return last.endsWith(".") ? last : `(${last.replace(/[()]/g, "")})`;
}

interface Question {
  question_id: number;
  question_text: string;
  student_answer: string;
  correct_answer: string;
  gpt_reasoning?: string;
  parent_text?: string;
  grandparent_text?: string;
  level?: "question" | "sub_question" | "subsub_question";
  parent_id?: number;
  label?: string;
}

export default function ReviewWrongQuestions() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [reAnswers, setReAnswers] = useState<Record<number, string>>({});
  const [message, setMessage] = useState<string | null>(null);
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

        const questionsWithLabels = await Promise.all(
          (res.data || []).map(async (q: any) => {
            try {
              const labelRes = await axios.get(`/api/student/debug-question-label?qid=${q.question_id}`);
              return {
                ...q,
                label: labelRes.data.fullLabel || "?",
                parent_id: q.parent_id,
                level: q.level,
                question_text: q.question_text || "",
              };
            } catch {
              return { ...q, label: "?", question_text: q.question_text || "" };
            }
          })
        );

        console.log("🧩 labelInfo enriched:", questionsWithLabels);
        setQuestions(questionsWithLabels);
        console.log("📦 loaded questions:", res.data);
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
  console.log("👉 current question:", current);
  if (!current) {
    return <div className="p-6">Loading question...</div>;
  }

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
              {(() => {
                const grandparent = questions.find(q => q.question_id === questions.find(p => p.question_id === current.parent_id)?.parent_id);
                return grandparent ? (
                  <p className="text-xs text-gray-500 italic mb-1">
                    {current.level === "subsub_question"
                      ? extractCurrentLevelLabel(grandparent.label || "?")
                      : grandparent.label || "?"} {grandparent.question_text}
                  </p>
                ) : null;
              })()}
              {(() => {
                const parent = questions.find(q => q.question_id === current.parent_id);
                return parent ? (
                  <p className="text-xs text-gray-500 italic mb-1">
                    {current.level === "subsub_question"
                      ? extractCurrentLevelLabel(parent.label || "?")
                      : parent.label || "?"} {parent.question_text}
                  </p>
                ) : null;
              })()}
              <p className="text-lg font-medium leading-relaxed bg-gray-50 p-4 rounded border-l-4 border-blue-500">
                {(() => {
                  const match = current.label?.match(/\(([^)]+)\)$/);
                  const digitMatch = current.label?.match(/^(\d+\.)$/);
                  if (match) return `(${match[1]})`;
                  if (digitMatch) return digitMatch[1];
                  return current.label || "?";
                })()} {current.question_text.replace(/^\s*\(?[a-zivx]+\)?\s*/i, "")}
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
              <button
                className="mt-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                onClick={async () => {
                  try {
                    const answer = reAnswers[current.question_id] || "";
                    const res = await axios.post("/api/student/recheck-answer", {
                      question_id: current.question_id,
                      answer,
                    });

                    if (res.data.correct) {
                      setQuestions(prev => prev.filter(q => q.question_id !== current.question_id));
                      setCurrentIndex(0);
                      setMessage("✅ Correct! Removed from review list.");
                    } else {
                      setMessage("❌ Still incorrect. Try again.");
                    }
                  } catch (err) {
                    setMessage("⚠️ Error submitting answer.");
                    console.error(err);
                  }
                }}
              >
                Submit Answer
              </button>
            </div>

            {message && <p className="text-sm mt-2 text-blue-700">{message}</p>}

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

            <p className="mt-4">&nbsp;</p>
            <div className="mt-12 flex justify-center">
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
