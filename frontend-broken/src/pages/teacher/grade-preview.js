// frontend/src/pages/teacher/grade-preview.js
import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5001";

export default function GradePreview() {
  const [input, setInput] = useState(`{
  "Q1(a)": "Pass 1: 1 3 5 2 7 9\nPass 2: 1 3 2 5 7 9\nPass 3: 1 2 3 5 7 9",
  "Q2(a)": "We removed people, removed weather, and simplified buildings to focus on layout only.",
  "Q3": "An IDE provides features like debugging, syntax highlighting, and code completion. A text editor is lightweight but lacks integrated features. IDEs are better for large projects."
}`);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGrade = async () => {
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const parsed = JSON.parse(input);
      const res = await fetch(`${API_BASE}/api/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paperId: "demo", answers: parsed }),
      });
      const data = await res.json();
      console.log("📦 full result", data);
      setResult(data);
    } catch (e) {
      setError("❌ 输入格式有误，请确保是合法的 JSON 格式！\n" + e.message);
    }
    setLoading(false);
  };

  const insertSample = () => {
    setInput(`{
  "Q1(a)": "Pass 1: 1 3 5 2 7 9\nPass 2: 1 3 2 5 7 9\nPass 3: 1 2 3 5 7 9",
  "Q2(a)": "We removed people, removed weather, and simplified buildings to focus on layout only.",
  "Q3": "An IDE provides features like debugging, syntax highlighting, and code completion. A text editor is lightweight but lacks integrated features. IDEs are better for large projects."
}`);
    setResult(null);
    setError(null);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">🎯 AI 自动评分预览</h1>

      <div className="flex gap-2">
        <button
          onClick={insertSample}
          className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
        >
          插入测试数据
        </button>
        <button
          onClick={handleGrade}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {loading ? "评分中..." : "提交评分"}
        </button>
      </div>

      <textarea
        className="w-full h-40 p-2 border rounded"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      {error && (
        <div className="text-red-600 whitespace-pre-wrap font-mono bg-red-50 p-4 border rounded">
          {error}
        </div>
      )}

      {result && !error && (
        <div className="space-y-6">
          <div className="bg-green-100 text-green-800 p-4 rounded border font-semibold">
            🧾 总分：
            {Object.values(result.graded).reduce((acc, r) => acc + r.score, 0)} / {Object.values(result.graded).reduce((acc, r) => acc + r.max, 0)}
          </div>

          {Object.entries(result.graded)
            .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
            .map(([qid, details]) => (
              <div key={qid} className="bg-white border rounded p-4">
                <h3 className="font-semibold text-lg">📌 {qid}</h3>
                <p>得分: {details.score} / {details.max}</p>
                <p className="text-sm text-gray-700 mt-1">💬 GPT反馈: {details.feedback}</p>
                <div className="mt-2 text-sm text-gray-600">
                  <p className="font-medium text-blue-600">🧠 官方阅卷点评</p>
                  <p className="mt-1 whitespace-pre-wrap bg-gray-50 border rounded p-2">
                    {details.examinerReport || "（无）"}
                  </p>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
