import React from 'react';

interface DebugLogsProps {
  logs: {
    parse_pdf?: string;
    parse_markscheme?: string;
    parse_report?: string;
  };
}

const DebugLogs: React.FC<DebugLogsProps> = ({ logs }) => {
  if (!logs) return null;

  return (
    <div className="mt-6 p-4 bg-gray-100 rounded-md text-sm font-mono whitespace-pre-wrap space-y-4">
      <h3 className="font-bold text-lg">🪵 Python 调试日志</h3>

      {logs.parse_pdf && (
        <div>
          <div className="font-semibold text-red-600 mb-1">parse_pdf.py</div>
          <pre className="text-red-800 bg-white p-2 rounded border border-gray-300 overflow-auto">
            {logs.parse_pdf}
          </pre>
        </div>
      )}

      {logs.parse_markscheme && (
        <div>
          <div className="font-semibold text-yellow-600 mb-1">parse_markscheme.py</div>
          <pre className="text-yellow-800 bg-white p-2 rounded border border-gray-300 overflow-auto">
            {logs.parse_markscheme}
          </pre>
        </div>
      )}

      {logs.parse_report && (
        <div>
          <div className="font-semibold text-yellow-600 mb-1">parse_report.py</div>
          <pre className="text-yellow-800 bg-white p-2 rounded border border-gray-300 overflow-auto">
            {logs.parse_report}
          </pre>
        </div>
      )}
    </div>
  );
};

export default DebugLogs;
