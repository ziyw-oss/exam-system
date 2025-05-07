import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

interface DecodedToken {
  id: number;
  name: string;
  role: string;
}

interface Keypoint {
  id: number;
  name: string;
}

interface Chapter {
  id: number;
  name: string;
  keypoints: Keypoint[];
}

interface Section {
  id: number;
  name: string;
  chapters: Chapter[];
}

interface Exam {
  id: number;
  name: string;
}

export default function ExamSetup() {
  const router = useRouter();
  const { resume, sessionId } = router.query;

  const [structure, setStructure] = useState<Section[]>([]);
  const [examList, setExamList] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [selectedKeypoints, setSelectedKeypoints] = useState<number[]>([]);
  const [duration, setDuration] = useState(75);
  const [examMode, setExamMode] = useState<string>("");

  // ✅ 确保 router 准备好后再设置 mode
  useEffect(() => {
    if (router.isReady && typeof router.query.mode === "string") {
      setExamMode(router.query.mode);
    }
  }, [router.isReady, router.query.mode]);

  // 🚀 如果是 resume 并且 sessionId 有效，直接跳转 doing 页面
  useEffect(() => {
    if (resume && sessionId) {
      router.push(`/student/exam/doing?sessionId=${sessionId}`);
    }
  }, [resume, sessionId]);

  useEffect(() => {
    if (examMode === "keypoint") {
      axios.get("/api/student/keypoint-structure").then((res) => {
        setStructure(res.data);
      });
    } else if (examMode === "exam") {
      axios.get("/api/student/setupexam").then((res) => {
        setExamList(res.data);
      });
    }
  }, [examMode]);

  const handleStart = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please log in first");
        return;
      }
      const decoded = jwtDecode<DecodedToken>(token);
      const userId = decoded.id;

      if (!examMode || (examMode !== "exam" && examMode !== "keypoint")) {
        alert("Invalid exam mode. Please refresh the page.");
        return;
      }

      const payload: any = {
        userId,
        mode: examMode,
        duration,
      };

      if (examMode === "exam") {
        if (!selectedExamId) {
          alert("Please select an exam before starting");
          return;
        }
        payload.examId = selectedExamId;
      } else if (examMode === "keypoint") {
        if (selectedKeypoints.length === 0) {
          alert("Please select at least one keypoint");
          return;
        }
        payload.keypointIds = selectedKeypoints;
        payload.questionCount = 10;
      }

      const response = await axios.post("/api/student/start-exam", payload, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const { sessionId } = response.data;
      router.push(`/student/exam/doing?sessionId=${sessionId}`);
    } catch (err) {
      alert("Failed to start exam. Please try again.");
      console.error(err);
    }
  };

  const handleResume = async () => {
    const sessionId = localStorage.getItem("in_progress_session_id");
    if (!sessionId) {
      alert("No unfinished exam found.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`/api/student/validate-session?sessionId=${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.data.valid) {
        alert("The previous exam session contains no questions. Please start a new exam.");
        localStorage.removeItem("in_progress_session_id");
        return;
      }

      router.push(`/student/exam/setup?resume=1&sessionId=${sessionId}&mode=exam`);
    } catch (err) {
      console.error("Resume validation failed:", err);
      alert("Error validating session. Please try again.");
    }
  };

  const section = structure.find((s: Section) => s.id === selectedSection);
  const chapter = section?.chapters.find((c: Chapter) => c.id === selectedChapter);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">🧪 Exam Setup</h1>

      <p className="text-sm text-gray-400">Current Mode: {examMode}</p>

      <button
        onClick={handleResume}
        className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
      >
        📌 Resume Previous Exam
      </button>

      {examMode === "exam" && (
        <div>
          <label className="block font-medium mb-1">Select Exam</label>
          <select
            className="border p-1 rounded"
            value={selectedExamId ?? ""}
            onChange={(e) => setSelectedExamId(parseInt(e.target.value))}
          >
            <option value="">Please select an exam</option>
            {examList.map((exam: Exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {examMode === "keypoint" && (
        <>
          <div>
            <label className="block font-medium">Section</label>
            <select
              className="border p-1 rounded"
              value={selectedSection ?? ""}
              onChange={(e) => {
                setSelectedSection(parseInt(e.target.value));
                setSelectedChapter(null);
                setSelectedKeypoints([]);
              }}
            >
              <option value="">Select Section</option>
              {structure.map((s: Section) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {section && (
            <div>
              <label className="block font-medium">Chapter</label>
              <select
                className="border p-1 rounded"
                value={selectedChapter ?? ""}
                onChange={(e) => {
                  setSelectedChapter(parseInt(e.target.value));
                  setSelectedKeypoints([]);
                }}
              >
                <option value="">Select Chapter</option>
                {section.chapters.map((c: Chapter) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {chapter && (
            <div>
              <label className="block font-medium">Keypoints</label>
              <div className="grid grid-cols-2 gap-2">
                {chapter.keypoints.map((kp: Keypoint) => (
                  <label key={kp.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedKeypoints.includes(kp.id)}
                      onChange={() => {
                        setSelectedKeypoints((prev) =>
                          prev.includes(kp.id)
                            ? prev.filter((id) => id !== kp.id)
                            : [...prev, kp.id]
                        );
                      }}
                    />
                    {kp.name}
                  </label>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div>
        <label className="block font-medium">Duration (minutes)</label>
        <input
          type="number"
          className="border p-1"
          value={duration}
          onChange={(e) => setDuration(parseInt(e.target.value))}
          min={1}
        />
      </div>

      <button
        onClick={handleStart}
        className="w-full bg-black text-white py-2 rounded hover:bg-gray-800 transition"
        disabled={examMode === "keypoint" && selectedKeypoints.length === 0}
      >
        🚀 Start Exam
      </button>
    </div>
  );
}
