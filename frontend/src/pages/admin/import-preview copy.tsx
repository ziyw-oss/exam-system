import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function ImportPreview() {
  const router = useRouter();
  const { uuid } = router.query;
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const [markscheme, setMarkscheme] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [output, setOutput] = useState<any>(null); // 新增 output 状态

  useEffect(() => {
    if (!router.isReady || !uuid) return;

    fetch(`/api/admin/preview-exam?uuid=${uuid}`)
      .then(res => res.json())
      .then(json => {
        if (json.error) setError(json.error);
        else setData(json);
      })
      .catch(err => setError("❌ 加载失败: " + err.message));

    fetch(`/api/admin/load-json?uuid=${uuid}&file=markscheme.json`)
      .then(res => res.json())
      .then(json => setMarkscheme(json))
      .catch(() => setMarkscheme(null));

    fetch(`/api/admin/load-json?uuid=${uuid}&file=report.json`)
      .then(res => res.json())
      .then(json => setReport(json))
      .catch(() => setReport(null));

    fetch(`/api/admin/load-json?uuid=${uuid}&file=output.json`)
      .then(res => res.json())
      .then(json => setOutput(json))
      .catch(() => setOutput(null));
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

          {q.subquestions?.map((sub: any, j: number) => (
            <div key={j} className="ml-4 mt-2 border-l-2 pl-4 border-gray-300">
              <p className="text-sm text-gray-700 mb-1">🔸 小题号: <strong>{sub.subquestion_number}</strong></p>
              <p className="whitespace-pre-wrap">{sub.subquestion_text}</p>
              {sub.examiner_comment && (
                <div className="mt-2 text-xs bg-yellow-50 border-l-4 border-yellow-400 pl-2 py-1">
                  <p className="text-yellow-700">🧠 小题考官评语:</p>
                  <p className="whitespace-pre-wrap text-gray-800">{sub.examiner_comment}</p>
                </div>
              )}
            </div>
          ))}

          {q.examiner_comment && (
            <div className="mt-2 text-sm bg-yellow-50 border-l-4 border-yellow-400 pl-3 py-2">
              <p className="text-yellow-700">🧠 Examiner Report:</p>
              <p className="whitespace-pre-wrap text-gray-800">{q.examiner_comment}</p>
            </div>
          )}
        </div>
      ))}

      {markscheme && (
        <div className="border rounded-lg p-4 bg-blue-50">
          <h2 className="font-bold text-blue-700 mb-2">📑 Mark Scheme（评分标准）</h2>
          <pre className="whitespace-pre-wrap text-sm text-gray-800">{JSON.stringify(markscheme, null, 2)}</pre>
        </div>
      )}

      {report && (
        <div className="border rounded-lg p-4 bg-pink-50">
          <h2 className="font-bold text-pink-700 mb-2">🧠 Examiner Report（考官报告）</h2>
          <pre className="whitespace-pre-wrap text-sm text-gray-800">{JSON.stringify(report, null, 2)}</pre>
        </div>
      )}

      {output && (
        <div className="border rounded-lg p-4 bg-green-50">
          <h2 className="font-bold text-green-700 mb-2">📝 Output 原始内容</h2>
          <pre className="whitespace-pre-wrap text-sm text-gray-800">{JSON.stringify(output, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}