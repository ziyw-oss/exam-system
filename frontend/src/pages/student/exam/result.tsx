import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";

interface ScoreDetail {
  question_id: number;
  score: number;
  question_text: string;
  correct_answer: string;
}

export default function ExamResultPage() {
  const router = useRouter();
  const { sessionId } = router.query;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    totalScore: number;
    avgScore: number;
    questionCount: number;
    scores: ScoreDetail[];
  } | null>(null);

  useEffect(() => {
    const fetchResult = async () => {
      const token = localStorage.getItem("token");
      if (!token || !sessionId) return;

      try {
        const res = await axios.get(`/api/student/exam-result?sessionId=${sessionId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setData(res.data);
      } catch (err) {
        console.error("加载成绩失败", err);
        alert("❌ 成绩加载失败，请稍后再试");
        router.push("/student/exam/start");
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [sessionId]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">📊 考试成绩报告</h1>

      {loading ? (
        <p>加载中...</p>
      ) : !data ? (
        <p>未找到成绩数据</p>
      ) : (
        <>
          <div className="bg-white shadow rounded p-4 mb-6">
            <p>总分：<strong>{data.totalScore}</strong></p>
            <p>平均分：<strong>{data.avgScore.toFixed(2)}</strong></p>
            <p>题目数量：<strong>{data.questionCount}</strong></p>
          </div>

          <div className="space-y-4">
            {data.scores.map((s, idx) => (
              <div key={s.question_id} className="border rounded p-4 bg-white shadow-sm">
                <p className="font-medium mb-1">Q{idx + 1}: {s.question_text}</p>
                <p className="text-sm text-gray-600">你的得分：<strong>{s.score}</strong></p>
                <p className="text-sm text-gray-600">标准答案：{s.correct_answer}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}