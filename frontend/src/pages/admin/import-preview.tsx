// frontend/src/pages/admin/import-preview.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function ImportPreview() {
  const router = useRouter();
  const { uuid } = router.query;
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!router.isReady || !uuid) return;
    fetch(`/api/admin/preview-exam?uuid=${uuid}`)
      .then(res => res.json())
      .then(json => {
        if (json.error) setError(json.error);
        else setData(json);
      })
      .catch(err => setError("❌ 加载失败: " + err.message));
  }, [router.isReady, uuid]);

  if (error) return <div className="p-6 text-red-600 font-mono">{error}</div>;
  if (!data) return <div className="p-6">加载中...</div>;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold">📦 试卷结构化预览</h1>

      <div className="text-sm text-gray-600">
        <p>🆔 UUID: <code>{uuid}</code></p>
        <p>📘 题目数: {data.structured?.length || 0}</p>
      </div>

      {data.structured?.map((q: any, i: number) => (
        <div key={i} className="border rounded-lg p-4 bg-white shadow-sm">
          <p className="text-gray-500 text-sm mb-2">题号: <strong>{q.question_number}</strong></p>
          <p className="whitespace-pre-wrap font-medium">{q.question_text}</p>
          {q.examiner_comment && (
            <div className="mt-2 text-sm bg-yellow-50 border-l-4 border-yellow-400 pl-3 py-2">
              <p className="text-yellow-700">🧠 Examiner Report:</p>
              <p className="whitespace-pre-wrap text-gray-800">{q.examiner_comment}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
