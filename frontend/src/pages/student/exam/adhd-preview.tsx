import React from "react";

export default function AdhdFriendlyExamPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans text-gray-900">
      <h1 className="text-xl font-bold mb-4">🧪 Tailwind Overflow Test</h1>

      <div className="bg-white border border-gray-300 rounded shadow p-4">
        <div className="text-base leading-relaxed text-gray-800 h-64 overflow-y-auto">
          {Array.from({ length: 20 }, (_, i) => (
            <p key={i} className="mb-2">
              Line {i + 1}: This is a test line to demonstrate vertical scroll overflow. This is repeated multiple times to ensure overflow behavior. This is repeated multiple times to ensure overflow behavior. This is repeated multiple times to ensure overflow behavior.
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
