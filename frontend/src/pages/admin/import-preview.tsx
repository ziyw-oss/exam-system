import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import DebugLogs from '@/src/components/DebugLogs';


export default function ImportPreview() {
  const router = useRouter();
  const { uuid } = router.query;
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string>("");
  const [markscheme, setMarkscheme] = useState<any[]>([]);
  const [report, setReport] = useState<any[]>([]);
  const [logs, setLogs] = useState<any>(null); 

  useEffect(() => {
    if (!router.isReady || !uuid) return;

    fetch(`/api/admin/load-json?uuid=${uuid}&file=output.json`)
      .then(res => res.json())
      .then(json => setData(Array.isArray(json) ? json : []))
      .catch(err => setError("❌ 加载 output.json 失败: " + err.message));

    fetch(`/api/admin/load-json?uuid=${uuid}&file=markscheme.json`)
      .then(res => res.json())
      .then(json => setMarkscheme(json.markscheme || []))
      .catch(() => setMarkscheme([]));

    fetch(`/api/admin/load-json?uuid=${uuid}&file=report.json`)
      .then(res => res.json())
      .then(json => setReport(json.report || []))
      .catch(() => setReport([]));
  }, [router.isReady, uuid]);

  const getMarkscheme = (questionId: string) => {
    return markscheme.find((m) => m.question_id === questionId);
  };

  const getReport = (questionId: string) => {
    return report.find((r) => r.question_id === questionId);
  };

  const renderSubsub = (subsub: any, parentKey: string) => {
    const id = `${parentKey}(${subsub.roman})`;
    const mark = getMarkscheme(id);
    const rep = getReport(id);
    return (
      <div key={id} className="ml-8 border-l-2 pl-4 mt-2">
        <p className="text-sm font-semibold">({subsub.roman}) {subsub.text}</p>
        {mark && (
          <div className="text-xs text-blue-600">评分: {JSON.stringify(mark)}</div>
        )}
        {rep && (
          <div className="text-xs text-pink-600">考官评语: {rep.comment}</div>
        )}
      </div>
    );
  };

  const renderSub = (sub: any, parentNum: number) => {
    const id = `${parentNum} (${sub.letter})`;
    const mark = getMarkscheme(id);
    const rep = getReport(id);
    return (
      <div key={id} className="ml-4 mt-2">
        <p className="font-medium">({sub.letter}) {sub.text}</p>
        {mark && (
          <div className="text-sm text-blue-600">评分: {JSON.stringify(mark)}</div>
        )}
        {rep && (
          <div className="text-sm text-pink-600">考官评语: {rep.comment}</div>
        )}
        {sub.subsub_questions?.map((s: any) => renderSubsub(s, id))}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold">📦 试卷结构化预览</h1>

      {error && <div className="text-red-600 font-mono">{error}</div>}

      <div className="text-sm text-gray-600">
        <p>🆔 UUID: <code>{uuid}</code></p>
        <p>📘 题目数: {data.length}</p>
      </div>

      {data.map((q: any) => (
        <div key={q.number} className="border rounded-lg p-4 bg-white shadow-sm">
          <p className="text-gray-500 text-sm mb-2">题号: <strong>{q.number}</strong></p>
          <p className="whitespace-pre-wrap font-medium">{q.text}</p>
          {q.sub_questions?.map((s: any) => renderSub(s, q.number))}
        </div>
      ))}
      // 在 return 内部
      {logs && <DebugLogs logs={logs} />}
    </div>
    
    

  );
}