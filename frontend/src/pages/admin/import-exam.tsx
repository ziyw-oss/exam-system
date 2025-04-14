// frontend/src/pages/admin/import-exam.tsx
import { useState, useRef } from "react";
import { useRouter } from "next/router";

export default function ImportExamPage() {
  const [files, setFiles] = useState({ paper: null, markscheme: null, report: null });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const refPaper = useRef<HTMLInputElement>(null);
  const refMark = useRef<HTMLInputElement>(null);
  const refReport = useRef<HTMLInputElement>(null);
  const locked = useRef(false); // ✅ 点击锁防止重复触发

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    setFiles({ ...files, [key]: e.target.files?.[0] || null });
  };

  const resetInputs = () => {
    if (refPaper.current) refPaper.current.value = "";
    if (refMark.current) refMark.current.value = "";
    if (refReport.current) refReport.current.value = "";
    setFiles({ paper: null, markscheme: null, report: null });
  };
  
  const handleSubmit = async () => {
    if (locked.current || loading) return; // ✅ 防止并发触发
    locked.current = true;

    if (!files.paper || !files.markscheme || !files.report) {
      setMessage("❌ 请上传所有三项文件！");
      locked.current = false;
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("paper", files.paper);
      formData.append("markscheme", files.markscheme);
      formData.append("report", files.report);

      // 调试 formData 内容
    console.log("🔍 formData 内容:");
    for (const [key, value] of formData.entries()) {
        console.log(`${key}:`, value);
    }

      const res = await fetch("/api/admin/import-exam", {
        method: "POST",
        body: formData,
      });

      let data;
      try {
        data = await res.json();
        console.log("✅ 解析后的 JSON 数据:", data); // 🔍 这里输出完整内容
      } catch (err) {
        const text = await res.text();
        setMessage("❌ 返回非 JSON: " + text.slice(0, 200));
        return;
      }

      
      if (res.ok) {
        setMessage("✅ 导入成功！正在跳转预览...");
        console.log("📦 structured:", data.structured);
        resetInputs();
        // 这里可以选择直接跳转到预览页面
        setTimeout(() => router.push(`/admin/import-preview?uuid=${data.uuid}`), 0);
      } else {
        setMessage("❌ 导入失败: " + (data?.error || "未知错误"));
      }
    } catch (e: any) {
      setMessage("❌ 请求失败: " + e.message);
    } finally {
      setLoading(false);
      locked.current = false; // ✅ 释放锁
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto space-y-4">
      <h1 className="text-xl font-bold">📥 导入新试卷资料</h1>

      <div>
        <label className="block font-medium">📄 试卷 PDF</label>
        <input ref={refPaper} type="file" accept=".pdf" onChange={(e) => handleFileChange(e, "paper")} />
      </div>
      <div>
        <label className="block font-medium">📑 Mark Scheme</label>
        <input ref={refMark} type="file" accept=".pdf,.json" onChange={(e) => handleFileChange(e, "markscheme")} />
      </div>
      <div>
        <label className="block font-medium">🧠 Examiner Report</label>
        <input ref={refReport} type="file" accept=".pdf,.json" onChange={(e) => handleFileChange(e, "report")} />
      </div>

      <button
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? "提交中..." : "提交导入"}
      </button>

      {message && <p className="mt-4 text-sm font-mono text-gray-700 whitespace-pre-wrap">{message}</p>}
    </div>
  );
}