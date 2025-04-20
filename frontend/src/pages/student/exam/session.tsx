import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

interface DecodedToken {
  id: number;
  name: string;
  role: string;
}

export default function ExamSession() {
  const router = useRouter();
  const { mode, duration, examId, keypointIds, questionCount } = router.query;

  const [questions, setQuestions] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!mode || !duration) return;

    const startExam = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          alert("请先登录");
          router.push("/login");
          return;
        }
        const decoded = jwtDecode<DecodedToken>(token);

        const res = await axios.post(
          "/api/student/start-exam",
          {
            mode,
            duration: parseInt(duration as string),
            examId: examId ? parseInt(examId as string) : undefined,
            keypointIds: keypointIds ? JSON.parse(keypointIds as string) : undefined,
            questionCount: questionCount ? parseInt(questionCount as string) : 10,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

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

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">考试进行中</h1>
      <p>剩余时间：{timeLeft} 秒</p>
      <div className="mt-4 space-y-4">
        {questions.map((q, index) => (
          <div key={q.id} className="border p-3 rounded">
            <p className="font-semibold">Q{index + 1}: {q.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
