// File: src/components/ResumeExamButton.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";

export default function ResumeExamButton() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUnfinished = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await axios.get("/api/student/check-session", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data?.sessionId) {
          setSessionId(res.data.sessionId);
        }
      } catch (err) {
        console.error("Error checking session", err);
      }
    };
    fetchUnfinished();
  }, []);

  if (!sessionId) return null;

  return (
    <button
      onClick={() => router.push(`/student/exam/doing?sessionId=${sessionId}`)}
      className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
    >
      📌 Resume Previous Exam
    </button>
  );
}