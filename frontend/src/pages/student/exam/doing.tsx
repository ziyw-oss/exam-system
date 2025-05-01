import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";

interface Question {
  question_bank_id: number;
  question_text: string;
  mark: number;
  level?: string;
  parent_text?: string;
  grandparent_text?: string;
  question_type?: string;
  code_block?: string | null;
  student_answer?: string;
}

export default function ExamDoing() {
  const router = useRouter();
  const sessionId = Array.isArray(router.query.sessionId)
    ? router.query.sessionId[0]
    : router.query.sessionId;

  const [examYear, setExamYear] = useState<string>("");
  const [examType, setExamType] = useState<string>("");
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  // Only used for numbering, not for navigation
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  // For navigating only answerable (mark>0) questions
  const [currentAnswerableIndex, setCurrentAnswerableIndex] = useState<number>(0);
  const [questionTime, setQuestionTime] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    const fetchSession = async () => {
      const token = localStorage.getItem("token");
      if (!token) return router.push("/login");

      try {
        const res = await axios.get(`/api/student/exam-questions?sessionId=${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const qList: Question[] = res.data.questions || [];
        const savedAnswers: Record<number, string> = res.data.answers || {};

        setQuestions(qList);
        setAnswers(savedAnswers);
        setTimeLeft(res.data.remainingTime);
        setLoading(false);
        setExamYear(res.data.examYear);
        setExamType(res.data.paperType);
      } catch (err) {
        console.error("Failed to load exam:", err);
        router.push("/student/exam/start");
      }
    };
    fetchSession();
  }, [sessionId]);

  useEffect(() => {
    const timer = setInterval(() => setQuestionTime((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [currentAnswerableIndex]);

  const answerableIndexes = questions
    .map((q, i) => (q.mark > 0 ? i : -1))
    .filter((i) => i !== -1);

  // For display: current position among answerable questions
  const currentAnswerablePosition = currentAnswerableIndex + 1;

  // Split formatQuestionNumber logic into separate functions
  const getMainIndex = (q: Question): string => {
    let mainIndex = 0;
    for (let i = 0; i < questions.length; i++) {
      const item = questions[i];
      if (item.level === "question") {
        mainIndex++;
      }
      if (item.question_bank_id === q.question_bank_id) {
        return `${mainIndex}`;
      }
    }
    return "";
  };

  const getSubIndex = (q: Question): string => {
    let mainIndex = 0;
    let subIndex = 0;
    for (let i = 0; i < questions.length; i++) {
      const item = questions[i];
      if (item.level === "question") {
        mainIndex++;
        subIndex = 0;
      }
      if (item.level === "sub_question") {
        subIndex++;
      }
      if (item.question_bank_id === q.question_bank_id) {
        // subIndex as letter: a, b, c...
        return String.fromCharCode(96 + subIndex);
      }
    }
    return "";
  };

  const getSubSubIndex = (q: Question): string => {
    let mainIndex = 0;
    let subIndex = 0;
    let subSubIndex = 0;
    const roman = ["(i)", "(ii)", "(iii)", "(iv)", "(v)", "(vi)", "(vii)", "(viii)", "(ix)", "(x)"];
    for (let i = 0; i < questions.length; i++) {
      const item = questions[i];
      if (item.level === "question") {
        mainIndex++;
        subIndex = 0;
        subSubIndex = 0;
      }
      if (item.level === "sub_question") {
        subIndex++;
        subSubIndex = 0;
      }
      if (item.level === "subsub_question") {
        subSubIndex++;
      }
      if (item.question_bank_id === q.question_bank_id) {
        // subSubIndex as roman numeral
        return roman[subSubIndex - 1] || "";
      }
    }
    return "";
  };

  const saveCurrentAnswer = async () => {
    const token = localStorage.getItem("token");
    if (!token || !sessionId) return;

    const currentQIndex = answerableIndexes[currentAnswerableIndex];
    const currentId = questions[currentQIndex]?.question_bank_id;
    if (!currentId) return;

    try {
      await axios.post("/api/student/save-answers", {
        sessionId,
        answers: {
          [currentId]: answers[currentId] || "",
        },
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error("Failed to save answer:", err);
    }
  };

  const handleAnswerChange = (qid: number, val: string) => {
    setAnswers((prev) => ({ ...prev, [qid]: val }));
  };

  const handleSubmitExam = async () => {
    const token = localStorage.getItem("token");
    if (!token || !sessionId) return;

    if (!window.confirm("Are you sure you want to submit? You can't change answers after submitting.")) return;

    setIsSubmitting(true);
    await saveCurrentAnswer();

    try {
      await axios.post("/api/student/submit-exam", { sessionId }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      router.push(`/student/exam/result?sessionId=${sessionId}`);
    } catch (err) {
      console.error("❌ Failed to submit exam:", err);
      alert("Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentQIndex = answerableIndexes[currentAnswerableIndex];
  const currentQ = questions[currentQIndex];
  const currentQid = currentQ?.question_bank_id;

  return (
    <div className="p-6 pb-40 relative min-h-screen">
      <p className="text-lg text-gray-600 mb-2 flex items-center gap-2">
         <span className="text-base">🧑‍🏫</span> Exam In Progress {examYear && `- ${examYear}`} {examType && `(${examType})`}
      </p>

      {loading ? <p>Loading...</p> : (
        <>
          <p className="mb-2 text-gray-600">⏱️ Time left: {Math.ceil(timeLeft / 60)} minutes</p>
          <p className="text-md text-gray-800 mb-2">
            📌 Question {currentAnswerablePosition} of {answerableIndexes.length}
          </p>

          <div className="border p-4 rounded shadow-sm bg-white w-full max-w-4xl mx-auto">
            {/* Render question structure and numbering */}
            {currentQ?.level === "question" && (
              <div className="mb-3 text-gray-600 text-base font-semibold whitespace-pre-wrap">
                {getMainIndex(currentQ)}. {currentQ.question_text}
                <br /><br />
              </div>
            )}
            {currentQ?.level === "sub_question" && (
              <>
                <div className="mb-3 text-gray-500 text-sm whitespace-pre-wrap">
                  {getMainIndex(currentQ)}. {currentQ.parent_text || ""}
                  <br /><br />
                </div>
                <div className="mb-3 text-gray-600 text-sm whitespace-pre-wrap">
                  ({getSubIndex(currentQ)}) {currentQ.question_text}
                  <br /><br />
                </div>
              </>
            )}
            {currentQ?.level === "subsub_question" && (
              <>
                <div className="mb-3 text-gray-500 text-sm whitespace-pre-wrap">
                  {getMainIndex(currentQ)}. {currentQ.grandparent_text || ""}
                  <br /><br />
                </div>
                <div className="mb-3 text-gray-500 text-sm whitespace-pre-wrap">
                  ({getSubIndex(currentQ)}) {currentQ.parent_text || ""}
                  <br /><br />
                </div>
                <div className="mb-2 whitespace-pre-wrap">
                  <span className="font-bold">{getSubSubIndex(currentQ)} </span>
                  <span className="text-gray-800">{currentQ.question_text.replace(/^\([ivxlcdm]+\)\s*/, "")}</span>
                </div>
              </>
            )}
            {/* Show marks */}
            <div>
              <span className="text-sm text-gray-500">({currentQ.mark} marks)</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">Time spent on this question: {questionTime} seconds</p>

            {currentQ?.question_type === "code_block" && currentQ.code_block && (
              <pre className="bg-gray-900 text-white p-4 rounded my-4 overflow-x-auto text-sm whitespace-pre-wrap">
                <code>{currentQ.code_block}</code>
              </pre>
            )}

            <div className="mt-4 mb-40">
              <textarea
                className="w-full border border-gray-300 p-4 rounded-md shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ width: "100vw", maxWidth: "100%", minHeight: "240px", boxSizing: "border-box" }}
                disabled={isSubmitting}
                value={answers[currentQid!] || ""}
                onChange={(e) => handleAnswerChange(currentQid!, e.target.value)}
              />
            </div>
          </div>

          <div className="fixed bottom-6 left-0 w-full flex flex-col items-center z-10 shadow-lg bg-white bg-opacity-95">
            <div className="flex gap-2 mb-2">
              <button
                disabled={currentAnswerableIndex === 0}
                onClick={async () => {
                  await saveCurrentAnswer();
                  setCurrentAnswerableIndex(currentAnswerableIndex - 1);
                  setQuestionTime(0);
                }}
                className="bg-gray-300 px-4 py-2 rounded disabled:opacity-50"
              >Previous</button>
              <button
                disabled={currentAnswerableIndex === answerableIndexes.length - 1}
                onClick={async () => {
                  await saveCurrentAnswer();
                  setCurrentAnswerableIndex(currentAnswerableIndex + 1);
                  setQuestionTime(0);
                }}
                className="bg-gray-300 px-4 py-2 rounded disabled:opacity-50"
              >Next</button>
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
