import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";

interface Question {
  id: number;
  text: string;
  mark: number; // 含分数字段
}

export default function ExamDoing() {
  const router = useRouter();
  const { sessionId } = router.query;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchSession = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("请先登录");
        router.push("/login");
        return;
      }

      try {
        const res = await axios.get(`/api/student/exam-questions?sessionId=${sessionId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setQuestions(res.data.questions);
        setTimeLeft(res.data.remainingTime);
        setLoading(false);
      } catch (err) {
        console.error("加载考试失败", err);
        alert("考试数据加载失败");
        router.push("/student/exam/start");
      }
    };

    if (sessionId) fetchSession();
  }, [sessionId]);

  const handleAnswerChange = (qid: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  };

  const handleSaveAnswers = async () => {
    const token = localStorage.getItem("token");
    if (!token || !sessionId) return;
    try {
      await axios.post(
        "/api/student/save-answers",
        {
          sessionId,
          answers,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      alert("✅ 答案已保存");
    } catch (err) {
      console.error("保存答案失败", err);
      alert("❌ 答案保存失败");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">📝 考试进行中</h1>
      {loading ? (
        <p>加载中...</p>
      ) : (
        <>
          <p className="mb-2 text-gray-600">⏱️ 剩余时间：{timeLeft} 秒</p>
          <div className="space-y-6">
            {questions.map((q, i) => (
                <div key={q.id} className="border p-4 rounded shadow-sm bg-white">
                <div className="text-base font-medium mb-2">
                    Q{i + 1}: {q.text}
                    {q.mark > 0 && <span className="ml-2 text-sm text-gray-500">（{q.mark} 分）</span>}
                </div>
                
                {q.mark > 0 && (
                    <div className="mt-2">
                    <textarea
                        className="w-full border p-2 rounded"
                        rows={4}
                        value={answers[q.id] || ""}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    />
                    </div>
                )}
                </div>
            ))}
          </div>
          <button
            onClick={handleSaveAnswers}
            className="mt-6 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            保存所有答案
          </button>
        </>
      )}
    </div>
  );
}