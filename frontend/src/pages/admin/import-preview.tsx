import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import DebugLogs from '@/components/DebugLogs';


export default function ImportPreview() {
  const router = useRouter();
  const { uuid } = router.query;
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string>("");
  const [markscheme, setMarkscheme] = useState<any[]>([]);
  const [report, setReport] = useState<any[]>([]);
  const [logs, setLogs] = useState<any>(null); 
  const [deletedNumbers, setDeletedNumbers] = useState<number[]>([]);
  const [reindexedData, setReindexedData] = useState<any[]>([]);

  useEffect(() => {
    if (!router.isReady || !uuid) return;

    fetch(`/api/admin/load-json?uuid=${uuid}&file=output.json`)
      .then(res => res.json())
      .then(json => {
        const items = Array.isArray(json) ? json : [];
        setData(items);
        setReindexedData(items); // 初始化用于人工审核的数据
      })
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

  const handleDelete = (num: number) => {
    const updated = reindexedData.filter((q) => q.number !== num);
    // 重新编号
    const reindexed = updated.map((q, i) => ({ ...q, number: i + 1 }));
    setDeletedNumbers([...deletedNumbers, num]);
    setReindexedData(reindexed);
  };

  const submitReview = async () => {
    const res = await fetch("/api/admin/update-after-review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uuid, deletedNumbers })
    });
    const json = await res.json();
    alert("提交结果: " + JSON.stringify(json));
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold">📦 试卷结构化预览</h1>

      {error && <div className="text-red-600 font-mono">{error}</div>}

      <div className="text-sm text-gray-600">
        <p>🆔 UUID: <code>{uuid}</code></p>
        <p>📘 题目数: {data.length}</p>
      </div>

      {reindexedData.map((q: any) => (
        <div key={q.number} className="border rounded-lg p-4 bg-white shadow-sm">
          <div className="flex justify-between">
            <p className="text-gray-500 text-sm mb-2">题号: <strong>{q.number}</strong></p>
            <button onClick={() => handleDelete(q.number)} className="text-red-500 text-sm hover:underline">
              删除此题
            </button>
          </div>
          <p className="whitespace-pre-wrap font-medium">{q.text}</p>
          {q.sub_questions?.map((s: any) => renderSub(s, q.number))}
        </div>
      ))}
      {deletedNumbers.length > 0 && (
        <div className="mt-6">
          <button onClick={submitReview} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            ✅ 人工审核完成，提交更新
          </button>
        </div>
      )}
      {logs && <DebugLogs logs={logs} />}
    </div>
    
    

  );
}