// ✅ React 组件版本：ResultCard.tsx

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ResultCardProps {
  question: string;
  score: number;
  studentAnswer: string;
  correctAnswerMarkdown?: string;
  correctAnswerFallback: string;
  reason?: string;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  question,
  score,
  studentAnswer,
  correctAnswerMarkdown,
  correctAnswerFallback,
  reason,
}) => {
  console.log("🔍 ResultCard props:", {
    question,
    score,
    studentAnswer,
    correctAnswerMarkdown,
    correctAnswerFallback,
    reason,
  });

  if (correctAnswerMarkdown) {
    console.log("📘 Markdown Input:", correctAnswerMarkdown);
  }

  return (
    <div
      className="bg-white border border-gray-300 rounded-2xl p-6 shadow-md space-y-6 text-base text-gray-800 font-sans"
      style={{ fontFamily: "'Roboto', 'Helvetica Neue', sans-serif" }}
    >
      {/* 📝 题干 + 分数 */}
      <p className="text-gray-900 font-medium text-base leading-relaxed flex justify-between items-center">
        <span className="pr-4">{question}</span>
        <span className="text-sm text-[#1e3a8a]">[{score}]</span>
      </p>

      {/* 🖊️ 学生答案 */}
      <div className="flex items-start gap-2 mt-3">
        
        
        <div className="text-sm text-gray-800">
          <div className="font-semibold text-gray-700 mb-1">Your Answer:</div>
          <div className="inline-block bg-gray-100 px-4 py-2 rounded-lg text-gray-900 shadow-sm border border-gray-200">
            {studentAnswer || "N/A"}
          </div>
        </div>
      </div>

      {/* 📘 正确答案 */}
      <div className="flex items-start gap-2 mt-4">
        
        <div className="text-sm text-gray-800">
          <div className="font-semibold text-gray-700 mb-2">Try to REMEMBER this answer</div>
          <div className="prose prose-sm leading-snug">
            {correctAnswerMarkdown ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {correctAnswerMarkdown}
              </ReactMarkdown>
            ) : (
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-normal">
                {correctAnswerFallback}
              </pre>
            )}
          </div>
        </div>
      </div>

      {/* 📎 评分理由 */}
      {reason && (
        <div className="flex items-start gap-2 mt-4">
          
          <div className="text-sm text-gray-800">
            <div className="font-semibold text-gray-700 mb-1">Marking Reason:</div>
            <p className="leading-relaxed text-gray-700 bg-gray-50 px-4 py-2 rounded-md border border-gray-200">
              {reason}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
 