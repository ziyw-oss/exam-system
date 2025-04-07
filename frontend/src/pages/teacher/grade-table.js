// frontend/src/pages/teacher/grade-table.js
import { useEffect, useState } from "react";

export default function GradeTable() {
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    // 假设 API 返回多个学生评分结果
    fetch("/api/grade/batch")
      .then((res) => res.json())
      .then(setSubmissions)
      .catch((e) => console.error("Failed to fetch grades", e));
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold mb-4">📊 成绩汇总</h1>
      <table className="table-auto w-full border text-sm">
        <thead>
          <tr className="bg-gray-200">
            <th className="p-2 border">学生</th>
            <th className="p-2 border">题号</th>
            <th className="p-2 border">得分</th>
            <th className="p-2 border">总分</th>
            <th className="p-2 border">反馈</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((record, i) =>
            Object.entries(record.graded).map(([qid, detail], j) => (
              <tr key={`${i}-${j}`} className="border-b">
                <td className="p-2 border">{record.studentId}</td>
                <td className="p-2 border">{qid}</td>
                <td className="p-2 border text-center">{detail.score}</td>
                <td className="p-2 border text-center">{detail.max}</td>
                <td className="p-2 border">{detail.feedback}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
