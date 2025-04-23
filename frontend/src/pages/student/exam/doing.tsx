// File: src/pages/student/exam/doing.tsx

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";

interface Question {
    id: number;
    text: string;
    mark: number;
    question_type?: string;
    code_block?: string | null;
  }
export default function ExamDoing() {
  const router = useRouter();
  const sessionId = Array.isArray(router.query.sessionId)
    ? router.query.sessionId[0]
    : router.query.sessionId;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [questionTime, setQuestionTime] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setQuestions([]);
    if (!sessionId) return;
    const fetchSession = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const res = await axios.get(`/api/student/exam-questions?sessionId=${sessionId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        console.log("✅ Loaded questions:", res.data.questions);
        setQuestions(res.data.questions);
        setAnswers(res.data.answers || {});
        setTimeLeft(res.data.remainingTime);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load exam:", err);
        router.push("/student/exam/start");
      }
    };

    fetchSession();
  }, [sessionId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setQuestionTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [currentIndex]);
  
  const answerableQuestions = questions.filter((q) => q.mark > 0);
  const answerableIndexes = questions
  .map((q, i) => (q.mark > 0 ? i : -1))
  .filter(i => i !== -1);

  const currentAnswerablePosition =
    answerableIndexes.findIndex(i => i === currentIndex) + 1;
  
    const saveCurrentAnswer = async () => {
    const token = localStorage.getItem("token");
    if (!token || !sessionId) return;

    const currentQuestionId = questions[currentIndex]?.id;
    if (!currentQuestionId) return;

    try {
      await axios.post(
        "/api/student/save-answers",
        {
          sessionId,
          answers: {
            [currentQuestionId]: answers[currentQuestionId] || "",
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (err) {
      console.error("Failed to save answer:", err);
    }
  };

  const handleAnswerChange = (qid: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  };

  const handleSubmitExam = async () => {
    const token = localStorage.getItem("token");
    if (!token || !sessionId) return;

    const confirm = window.confirm("Are you sure you want to submit? You can't change answers after submitting.");
    if (!confirm) return;

    setIsSubmitting(true);
    await saveCurrentAnswer();

    try {
      await axios.post(
        "/api/student/submit-exam",
        { sessionId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      router.push(`/student/exam/result?sessionId=${sessionId}`);
    } catch (err) {
      console.error("❌ Failed to submit exam:", err);
      alert("Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 pb-40 relative min-h-screen">
      <p className="text-lg text-gray-600 mb-2 flex items-center gap-2">
        <span className="text-base">🧑‍🏫</span> Exam In Progress
      </p>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <p className="mb-2 text-gray-600">⏱️ Time left: {Math.ceil(timeLeft / 60)} minutes</p>
          <p className="text-md text-gray-800 mb-2">
            {questions[currentIndex]?.mark > 0 ? (
                <>📌 Question {currentAnswerablePosition} of {answerableIndexes.length}</>
            ) : (
                <></>
            )}
          </p>

          {questions.length === 0 && (
            <p className="text-red-600 mt-4">
              No questions found in this exam. Please contact your instructor or try a different exam.
            </p>
          )}

          {questions.length > 0 && (
            <div className="border p-4 rounded shadow-sm bg-white w-full max-w-4xl mx-auto">
              <p className="text-lg font-medium leading-relaxed bg-gray-50 p-4 rounded border-l-4 border-blue-500">
                {questions[currentIndex].text.replace(/Q\d+:\s*/, "").replace(/\.+\s*\[\d+\]$/, "")}
                {questions[currentIndex].mark > 0 ? (
                  <span className="text-sm text-gray-500 ml-2">({questions[currentIndex].mark} marks)</span>
                ) : (
                  <span className="text-sm text-orange-500 ml-2">(Read carefully before answering sub-questions)</span>
                )}
              </p>
              <p className="text-sm text-gray-500 mt-2">Time spent on this question: {questionTime} seconds</p>
              {questions[currentIndex].question_type === "code_block" && questions[currentIndex].code_block && (
                <pre className="bg-gray-900 text-white p-4 rounded my-4 overflow-x-auto text-sm whitespace-pre-wrap">
                    <code>{questions[currentIndex].code_block}</code>
                </pre>
             )}
              <div className="mt-4 mb-40">
                {questions[currentIndex].mark > 0 ? (
                    <textarea
                    className="w-full border border-gray-300 p-4 rounded-md shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{
                        width: "100vw",
                        maxWidth: "100%",
                        minHeight: "120px",
                        boxSizing: "border-box",
                    }}
                    disabled={isSubmitting}
                    value={answers[questions[currentIndex].id] || ""}
                    onChange={(e) => handleAnswerChange(questions[currentIndex].id, e.target.value)}
                    />
                ) : (
                    <div
                    className="w-full border border-gray-300 p-4 rounded-md shadow text-gray-500 text-sm text-center bg-gray-50"
                    style={{
                        width: "100vw",
                        maxWidth: "100%",
                        minHeight: "120px",
                        boxSizing: "border-box",
                    }}
                    >
                    
                    </div>
                )}
              </div>
            </div>
          )}

          <div className="fixed bottom-6 left-0 w-full flex flex-col items-center z-10 shadow-lg bg-white bg-opacity-95">
            <div className="flex gap-2 mb-2">
              <button
                disabled={currentIndex === 0}
                onClick={async () => {
                  await saveCurrentAnswer();
                  setCurrentIndex(currentIndex - 1);
                  setQuestionTime(0);
                }}
                className="bg-gray-300 px-4 py-2 rounded disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={currentIndex === questions.length - 1}
                onClick={async () => {
                  await saveCurrentAnswer();
                  setCurrentIndex(currentIndex + 1);
                  setQuestionTime(0);
                }}
                className="bg-gray-300 px-4 py-2 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>

            <button
              onClick={handleSubmitExam}
              disabled={isSubmitting}
              className="bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {isSubmitting ? "Submitting and marking..." : "📤 Submit Exam"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
