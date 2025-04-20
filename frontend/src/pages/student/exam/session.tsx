import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";

interface Question {
  id: number;
  text: string;
}

export default function ExamSessionPage() {
  const router = useRouter();
  const { mode, duration, questionCount, examId, keypointIds } = router.query;

  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);

  // 初始化考试 session
  useEffect(() => {
    if (!mode || !duration) return;

    const startExam = async () => {
      try {
        const res = await axios.post("/api/student/start-exam", {
          userId: 1, // TODO: 替换为实际登录用户 ID
          mode,
          duration: parseInt(duration as string),
          examId: examId ? parseInt(examId as string) : undefined,
          keypointIds: keypointIds ? JSON.parse(keypointIds as string) : undefined,
          questionCount: questionCount ? parseInt(questionCount as string) : 10,
        });

        setQuestions(res.data.questions);
        setSessionId(res.data.sessionId);
        setTimeLeft(parseInt(duration as string) * 60);
        localStorage.setItem("in_progress_session_id", res.data.sessionId);
      } catch (err) {
        console.error("考试启动失败", err);
        alert("无法开始考试，请重试");
        router.push("/student/exam/start");
      }
    };

    startExam();
  }, [mode, duration, examId, keypointIds, questionCount]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (timerActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft <= 0 && sessionId) {
      alert("时间到，考试结束。将自动提交试卷。");
      // TODO: 自动提交逻辑
      setTimerActive(false);
    }
    return () => clearInterval(timer);
  }, [timeLeft, timerActive]);

  const handlePause = () => {
    setTimerActive(false);
    alert("考试已暂停，下次可以从当前位置继续。");
    // TODO: 保存当前 session 状态和剩余时间到后端或 localStorage
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">🧪 考试进行中</h2>
          <div className="text-red-600 font-semibold">⏳ 剩余时间：{formatTime(timeLeft)}</div>
        </div>

        {questions.length === 0 ? (
          <div className="text-gray-500">正在加载题目...</div>
        ) : (
          <div className="space-y-4">
            {questions.map((q, index) => (
              <div key={q.id} className="border p-4 rounded">
                <div className="font-semibold">Q{index + 1}: {q.text}</div>
                {/* TODO: 添加选项或答题控件 */}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between mt-6">
          <button
            onClick={handlePause}
            className="bg-yellow-400 hover:bg-yellow-500 text-white px-4 py-2 rounded"
          >暂停考试</button>
          <button
            onClick={() => alert("提交答卷（TODO）")}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >提交答卷</button>
        </div>
      </div>
    </div>
  );
}
