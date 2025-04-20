import { useRouter } from "next/router";
import { useEffect } from "react";

export default function ExamStartPage() {
  const router = useRouter();

  useEffect(() => {
    const session = localStorage.getItem("in_progress_session_id");
    if (session) {
      // 检测未完成考试，提示继续
      const continueExam = window.confirm("检测到你有一次未完成的考试，是否继续？");
      if (continueExam) {
        router.push(`/student/exam/doing?examId=${session}`);
      }
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white shadow-md p-8 rounded-lg w-full max-w-md space-y-6">
        <h1 className="text-2xl font-bold text-center">🎯 开始一次新考试</h1>

        <div className="grid gap-4">
          <button
            className="bg-blue-600 text-white py-3 rounded hover:bg-blue-700"
            onClick={() => router.push("/student/exam/setup?mode=exam")}
          >📝 完整试卷考试</button>

          <button
            className="bg-purple-600 text-white py-3 rounded hover:bg-purple-700"
            onClick={() => router.push("/student/exam/setup?mode=keypoint")}
          >📚 按知识点考试</button>
        </div>
      </div>
    </div>
  );
}
