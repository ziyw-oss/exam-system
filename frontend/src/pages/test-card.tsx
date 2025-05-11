import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ResultCardProps {
  question: string;
  score: number;
  studentAnswer: string;
  correctAnswerMarkdown: string;
  correctAnswerFallback: string;
  reason: string;
}

export default function TestCardPage() {
  return (
    <div className="p-6">
      <ResultCard
        question="What does BIOS stand for?"
        score={2}
        studentAnswer="basic input/output system"
        correctAnswerMarkdown={`- Stored in ROM
- Performs POST
- Boots OS`}
        correctAnswerFallback="Stored in ROM\nPerforms POST\nBoots OS"
        reason="The answer only includes the full form of BIOS, but not its functions."
      />
    </div>
  );
}

export function ResultCard({
  question,
  score,
  studentAnswer,
  correctAnswerMarkdown,
  correctAnswerFallback,
  reason,
}: ResultCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4 text-sm text-gray-800 font-sans">
      <h2 className="text-base font-semibold text-gray-900">{question}</h2>
      <div className="text-xs text-gray-500">Score: {score}</div>
      <div className="flex items-start gap-2">
        <span className="font-medium text-gray-700">Your Answer:</span>
        <span className="bg-gray-100 px-3 py-1 rounded-md text-gray-800 shadow-sm border border-gray-200">
          {studentAnswer || "N/A"}
        </span>
      </div>
      <div className="font-medium text-gray-700">🧠 Try to REMEMBER this answer</div>
      <div className="prose prose-sm text-gray-800">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {correctAnswerMarkdown}
        </ReactMarkdown>
      </div>
      <div className="text-sm text-gray-700">
        <div className="font-medium mb-1">Marking Reason:</div>
        <div className="bg-gray-50 px-4 py-2 border border-gray-200 rounded-md shadow-sm leading-relaxed">
          {reason}
        </div>
      </div>
    </div>
  );
}
